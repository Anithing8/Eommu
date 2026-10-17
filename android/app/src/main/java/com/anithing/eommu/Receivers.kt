package com.anithing.eommu

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, i: Intent) {
        Store.init(ctx)
        val id = i.getStringExtra("id") ?: return
        if (i.action == "done") {
            Store.toggle(ctx, id)
            NotificationManagerCompat.from(ctx).cancel(id.hashCode())
            return
        }
        val t = Store.tasks.find { it.id == id } ?: return
        if (t.done) return
        Reminders.channel(ctx)
        val open = PendingIntent.getActivity(ctx, 0, Intent(ctx, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val done = PendingIntent.getBroadcast(ctx, id.hashCode() + 1,
            Intent(ctx, AlarmReceiver::class.java).setAction("done").putExtra("id", id),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = NotificationCompat.Builder(ctx, Reminders.CH)
            .setSmallIcon(R.drawable.ic_notif).setContentTitle(t.title)
            .setContentText(t.notes.ifBlank { "Due now" })
            .setContentIntent(open).setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_HIGH)
            .addAction(0, "Mark done", done).build()
        try { NotificationManagerCompat.from(ctx).notify(id.hashCode(), n) } catch (e: SecurityException) { }
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, i: Intent) {
        Store.init(ctx)
        Reminders.syncAll(ctx)
    }
}
