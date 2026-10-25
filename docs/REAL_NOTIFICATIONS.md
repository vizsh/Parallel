# Running Parallel over real notifications

Today the Smart inbox is fed by realistic sample pings from `/api/notifications/queue`. This document explains how Parallel would sit **on top of the phone's real notifications**: what each platform allows, which permissions are needed, the pipeline for one notification, and a step-by-step plan for the Android plugin. Nothing here is built yet; it is the specification for the next milestone.

---

## The short answer
| Platform | Can Parallel see other apps' notifications? | Can it hold them? | Realistic role |
|---|---|---|---|
| **Android** | ✅ yes, with *Notification access* granted by the user | ✅ snooze or cancel, then re-post at the checkpoint | **Primary target.** The full product works here. |
| **iOS** | ❌ no public API | ⚠️ only indirectly (Focus modes, Screen Time shields) | Companion: in-app inbox, Focus filter, Screen Time limits, future texts |
| **Windows** | ✅ `UserNotificationListener` (packaged app, user grants access) | ✅ can remove toasts | Laptop twin; ActivityWatch for app usage today |
| **macOS** | ❌ no public API | ❌ | ActivityWatch for app usage; Focus modes |
| **Web/PWA** | ❌ | ❌ | Dashboard, Multiverse, demo |

The API already reports this matrix: `GET /api/platform/capabilities`.

## Does the user have to open the app?
No, that's the point. On Android Parallel works **over** notifications:
1. A notification is posted by Instagram.
2. Parallel's listener sees it within milliseconds, reads only metadata, and asks the twin.
3. If the twin says *allow*, nothing visible happens: the notification behaves normally.
4. If the twin says *hold*, the original is snoozed or removed, and Parallel shows **one quiet companion notification**: “Instagram · −18 min if you tap · held until 1:00 PM” with **Peek · Hold · Open** actions.
   - **Peek** deep-links into the Door to the Future for that ping.
   - **Open** fires the original notification's own `contentIntent` (you get exactly what you would have got).
   - **Hold** dismisses the companion; the ping waits in the jar.
5. At the checkpoint, held pings come back as one digest notification (or individually re-posted).
6. The app is only opened for the fun parts: peeking, the jar, the receipt, the twin's insights.

This is exactly what `/demo` animates.

## The pipeline for one notification (Android)
```
StatusBarNotification posted
   │  packageName, notification.category, channel importance, isGroup, postTime, isOngoing
   │  people/sender class (contact? VIP?) from extras, then the extras are DISCARDED
   ▼
Map to a Parallel category  (com.instagram.android + CATEGORY_SOCIAL → social_like / social_dm …)
   ▼
Skip list: ongoing (media, navigation), calls, alarms, OTP/security, VIP senders, the user's "always through" apps
   ▼
Decide in < 50 ms ON DEVICE from a cached policy (per category × time-of-day × block thresholds,
downloaded from POST /api/simulations results / a compact model export). No network needed.
   ▼
allow  → do nothing
hold   → snoozeNotification(key, untilCheckpoint)  (API 26+)  or cancelNotification(key) + store a copy
digest → same as hold, but grouped into the evening digest
ask    → post the companion notification with Peek / Hold / Open and let the user choose
   ▼
Log the event (metadata only) → sync to POST /api/events when online → the twin refits
```

## Permissions and special access (Android)
| Access | Why | How the user grants it |
|---|---|---|
| **Notification access** (`BIND_NOTIFICATION_LISTENER_SERVICE`, declared on the service) | See, snooze and cancel notifications | Settings → Notification access (open it with `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`) |
| **POST_NOTIFICATIONS** (Android 13+) | Show the companion, digest and future-you notifications | Runtime prompt |
| **Usage access** (`PACKAGE_USAGE_STATS`) | App-switch timeline, dwell time, rabbit-hole detection (`UsageStatsManager.queryEvents`) | Settings → Usage access (`Settings.ACTION_USAGE_ACCESS_SETTINGS`) |
| **Do Not Disturb access** (`ACCESS_NOTIFICATION_POLICY`), optional | Stop the original *buzz* during focus blocks (see below) | Settings → Do Not Disturb access |
| **Ignore battery optimisations**, optional | Some OEMs kill background services | Battery settings; explain why first |
| Calendar (read), optional | Fill the weekly schedule automatically | Runtime prompt |

Onboarding asks for these one at a time, each with a plain-language reason and a “skip” option. Parallel still works (in a reduced mode) without the optional ones.

## The hard parts, and the honest answers
**1. The buzz has already happened.** A listener sees a notification *after* the system has shown and sounded it. Snoozing hides it, but the phone may already have buzzed. Options:
- During focus blocks, turn on **Do Not Disturb** through an automatic rule (`AutomaticZenRule`, with DND access) that lets VIP senders and calls through. Notifications arrive silently; the listener decides what to *re-surface*, and Parallel's own allow-through channel is allowed to bypass DND for things that should interrupt.
- Outside focus blocks, accept the first buzz and just manage the follow-on (holding the rest of a burst, preventing the feed rabbit hole).

**2. Snooze vs cancel.** `snoozeNotification(key, duration)` lets the system bring the notification back by itself, with its original actions intact. `cancelNotification(key)` removes it, so Parallel must re-post its own copy at the checkpoint (losing some original actions). Prefer snooze; fall back to cancel + copy for groups or apps that re-post.

**3. Apps that re-post.** Some apps update or re-post a notification several times. Deduplicate on `(package, tag, id)` and the group key, and debounce bursts (a group chat with 40 messages is one held item, not 40).

**4. Staying alive.** The system binds the listener service, which is robust, but some OEM skins (Xiaomi, Oppo, Vivo, Samsung power saving) still restrict background work. Detect it, show the specific steps for that phone (dontkillmyapp.com documents them), and request reconnection with `requestRebind`.

**5. Sensitive notifications.** Recent Android versions redact sensitive content (for example one-time passwords) from untrusted listeners. Parallel never needs the content, so this doesn't matter, and security/OTP notifications are on the always-through skip list.

**6. Google Play policy.** Notification access and usage access are sensitive. The app needs a prominent in-app disclosure before asking, a privacy policy that says exactly what is read (metadata) and what is never stored (content), and its core purpose must require the access. Expect review questions; Parallel's purpose (attention triage) is a direct fit.

## The Android plugin, step by step
1. **Create a Capacitor plugin** `ParallelListener` in `frontend/android/app/src/main/java/app/parallel/twin/` with:
   - `ParallelListenerService extends NotificationListenerService`
   - `ParallelListenerPlugin` (the Capacitor bridge): `isEnabled()`, `openSettings()`, `getHeld()`, `release()`, `setPolicy(json)`, and an event `notification` the web layer listens to.
2. **Manifest:**
   ```xml
   <service android:name=".ParallelListenerService"
            android:label="Parallel"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="false">
     <intent-filter>
       <action android:name="android.service.notification.NotificationListenerService" />
     </intent-filter>
   </service>
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
   <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions" />
   ```
3. **Service skeleton:**
   ```java
   public class ParallelListenerService extends NotificationListenerService {
     @Override public void onNotificationPosted(StatusBarNotification sbn) {
       if (sbn.isOngoing() || isSkipped(sbn)) return;
       String category = Categories.map(sbn.getPackageName(), sbn.getNotification().category);
       // metadata only: never read EXTRA_TEXT / EXTRA_BIG_TEXT
       Decision d = Policy.decide(category, System.currentTimeMillis(), Focus.current());
       if (d.hold()) {
         snoozeNotification(sbn.getKey(), d.untilMillis() - System.currentTimeMillis());
         Held.add(sbn, category);                  // for the jar and the digest
         Companion.post(this, sbn, d);             // Peek / Hold / Open actions
       }
       Events.log(sbn, category, d);               // synced to POST /api/events later
       ParallelListenerPlugin.emit(category, d);   // live update if the app is open
     }
   }
   ```
4. **Policy on device:** fetch a compact policy from the API (per category: open probability and expected cost by hour and block depth, plus thresholds) and refresh it daily, so decisions never wait on the network.
5. **Companion notification:** a low-importance channel “Parallel holds”, with actions:
   - `Peek` → `PendingIntent` to `app.parallel.twin://peek?category=…&app=…`, routed by the web app to `FuturePeek`.
   - `Open` → the original `sbn.getNotification().contentIntent`.
   - `Hold` → dismiss.
6. **Checkpoint release:** `AlarmManager` (or WorkManager) at each check moment posts the digest and un-snoozes or re-posts held items. The jar's **pour** calls `release()` immediately.
7. **Onboarding screen** in the web app: explain, then `openSettings()`; poll `isEnabled()` on resume.
8. **Test matrix:** stock Android (Pixel/emulator), Samsung One UI, one aggressive OEM (Xiaomi/Oppo/Vivo); WhatsApp group bursts; YouTube re-posts; a call during a focus block; reboot (listener rebinding).

## iOS: what is possible
- **No reading of other apps' notifications.** Notification Service Extensions only see the app's *own* pushes.
- **Focus filters** (`SetFocusFilterIntent`): when the user's Focus is on, Parallel adapts (stricter twin, “study mode” UI).
- **Screen Time APIs** (FamilyControls, DeviceActivity, ManagedSettings; needs Apple's entitlement): shield chosen apps during focus blocks and get a callback when a usage threshold is crossed (“you've spent 15 minutes on Instagram”), which can trigger a Door to the Future peek or a text from future you.
- **The in-app inbox, Multiverse and future texts** work the same as on Android.

## Desktop
- **Today:** ActivityWatch feeds app and window-switch events (titles are dropped) to `POST /api/ingest/activitywatch?tz_offset_min=330`.
- **Windows next:** a small packaged companion using `UserNotificationListener` (user grants access) can read toast metadata and remove toasts, mirroring the Android pipeline.
- **macOS:** no notification API; rely on Focus modes and ActivityWatch.

## Privacy guarantees that must hold in the real version
- The notification's title and text are never read into storage, never sent to the server, never used for training.
- What is stored: package/app, category, time, decision, the user's feedback, and outcome minutes.
- Everything is exportable and deletable from Settings; learning can be paused.
- The decision runs on the device; the server only sees aggregated events.
