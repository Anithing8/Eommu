package com.anithing.eommu

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.UUID

data class TList(val id: String, val name: String)

data class Task(
    val id: String, val listId: String, val title: String, val notes: String = "",
    val due: Long = 0L, val star: Boolean = false, val done: Boolean = false,
    val repeat: String = "", val created: Long = System.currentTimeMillis(),
    val parent: String = ""
)

private fun newId() = UUID.randomUUID().toString()

object Store {
    private lateinit var prefs: SharedPreferences
    private var ready = false
    var lists by mutableStateOf(listOf<TList>()); private set
    var tasks by mutableStateOf(listOf<Task>()); private set
    var cur by mutableStateOf(""); private set
    var sort by mutableStateOf("added"); private set

    fun init(ctx: Context) {
        if (ready) return
        ready = true
        prefs = ctx.applicationContext.getSharedPreferences("eommu", Context.MODE_PRIVATE)
        load()
    }

    private fun load() {
        val raw = prefs.getString("data", null)
        if (raw != null) {
            try {
                val j = JSONObject(raw)
                val la = j.getJSONArray("lists")
                lists = (0 until la.length()).map { TList(la.getJSONObject(it).getString("id"), la.getJSONObject(it).getString("name")) }
                val ta = j.getJSONArray("tasks")
                tasks = (0 until ta.length()).map {
                    val o = ta.getJSONObject(it)
                    Task(o.getString("id"), o.getString("listId"), o.getString("title"), o.optString("notes"), o.optLong("due"),
                        o.optBoolean("star"), o.optBoolean("done"), o.optString("repeat"), o.optLong("created"), o.optString("parent"))
                }
                cur = j.optString("cur"); sort = j.optString("sort", "added")
            } catch (e: Exception) { lists = emptyList(); tasks = emptyList() }
        }
        if (lists.isEmpty()) lists = listOf(TList(newId(), "My tasks"))
        if (lists.none { it.id == cur }) cur = lists.first().id
    }

    private fun save() {
        val j = JSONObject().put("cur", cur).put("sort", sort)
        j.put("lists", JSONArray().apply { lists.forEach { put(JSONObject().put("id", it.id).put("name", it.name)) } })
        j.put("tasks", JSONArray().apply {
            tasks.forEach {
                put(JSONObject().put("id", it.id).put("listId", it.listId).put("title", it.title).put("notes", it.notes)
                    .put("due", it.due).put("star", it.star).put("done", it.done).put("repeat", it.repeat).put("created", it.created).put("parent", it.parent))
            }
        })
        prefs.edit().putString("data", j.toString()).apply()
    }

    fun select(id: String) { cur = id; save() }
    fun cycleSort() { sort = when (sort) { "added" -> "due"; "due" -> "star"; else -> "added" }; save() }
    fun addList(name: String) { val l = TList(newId(), name); lists = lists + l; cur = l.id; save() }
    fun renameList(id: String, name: String) { lists = lists.map { if (it.id == id) it.copy(name = name) else it }; save() }
    fun deleteList(ctx: Context, id: String) {
        if (lists.size < 2) return
        tasks.filter { it.listId == id }.forEach { Reminders.cancel(ctx, it.id) }
        tasks = tasks.filter { it.listId != id }
        lists = lists.filter { it.id != id }
        if (cur == id) cur = lists.first().id
        save()
    }
    fun addTask(title: String, notes: String = "", due: Long = 0L, ctx: Context? = null) {
        val t = title.trim().take(200)
        if (t.isEmpty()) return
        val task = Task(newId(), cur, t, notes.trim(), due = due)
        tasks = tasks + task
        if (ctx != null) Reminders.set(ctx, task)
        save()
    }
    fun addSub(parentId: String, title: String) {
        val p = tasks.find { it.id == parentId } ?: return
        val t = title.trim().take(200)
        if (t.isEmpty()) return
        tasks = tasks + Task(newId(), p.listId, t, parent = p.id)
        save()
    }
    fun update(ctx: Context, t: Task) {
        tasks = tasks.map { if (it.id == t.id) t else if (it.parent == t.id) it.copy(listId = t.listId) else it }
        Reminders.set(ctx, t)
        save()
    }
    fun toggle(ctx: Context, id: String) {
        val t = tasks.find { it.id == id } ?: return
        val n = t.copy(done = !t.done)
        tasks = tasks.map { if (it.id == id) n else it }
        Reminders.set(ctx, n)
        if (n.done && n.repeat.isNotEmpty() && n.due > 0) {
            val next = n.copy(id = newId(), done = false, due = nextDue(n.due, n.repeat), created = System.currentTimeMillis())
            tasks = tasks + next + tasks.filter { it.parent == id }.map { it.copy(id = newId(), parent = next.id, done = false) }
            Reminders.set(ctx, next)
        }
        save()
    }
    fun remove(ctx: Context, ids: Set<String>): List<Task> {
        val all = ids + tasks.filter { it.parent in ids }.map { it.id }
        val gone = tasks.filter { it.id in all }
        gone.forEach { Reminders.cancel(ctx, it.id) }
        tasks = tasks.filter { it.id !in ids }
        save()
        return gone
    }
    fun restore(ctx: Context, ts: List<Task>) { tasks = tasks + ts; ts.forEach { Reminders.set(ctx, it) }; save() }
    /** Copies (or moves) the chosen tasks into the current list. Returns (copied, skipped because the title already exists). */
    fun copyFrom(ctx: Context, ids: Set<String>, move: Boolean): Pair<Int, Int> {
        val have = tasks.filter { it.listId == cur && it.parent.isEmpty() }.map { it.title }.toSet()
        val now = System.currentTimeMillis()
        var skip = 0
        val added = mutableListOf<Task>(); val moved = mutableSetOf<String>()
        for (t in tasks.filter { it.id in ids && it.parent.isEmpty() }) {
            if (t.title in have) { skip++; continue }
            val np = t.copy(id = newId(), listId = cur, done = false, due = if (t.due < now) 0L else t.due, created = now)
            added += np
            tasks.filter { it.parent == t.id }.forEach { c ->
                added += c.copy(id = newId(), listId = cur, parent = np.id, done = false, created = now); moved += c.id
            }
            moved += t.id
        }
        tasks = tasks + added
        added.forEach { Reminders.set(ctx, it) }
        if (move) { moved.forEach { Reminders.cancel(ctx, it) }; tasks = tasks.filter { it.id !in moved } }
        save()
        return added.count { it.parent.isEmpty() } to skip
    }
    private fun nextDue(due: Long, r: String): Long {
        val c = Calendar.getInstance().apply { timeInMillis = due }
        when (r) { "daily" -> c.add(Calendar.DAY_OF_YEAR, 1); "weekly" -> c.add(Calendar.DAY_OF_YEAR, 7); else -> c.add(Calendar.MONTH, 1) }
        return c.timeInMillis
    }
}

object Reminders {
    const val CH = "reminders"
    fun channel(ctx: Context) {
        ctx.getSystemService(NotificationManager::class.java)
            .createNotificationChannel(NotificationChannel(CH, "Reminders", NotificationManager.IMPORTANCE_HIGH))
    }
    private fun pi(ctx: Context, id: String): PendingIntent =
        PendingIntent.getBroadcast(ctx, id.hashCode(), Intent(ctx, AlarmReceiver::class.java).putExtra("id", id),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun cancel(ctx: Context, id: String) { ctx.getSystemService(AlarmManager::class.java).cancel(pi(ctx, id)) }
    fun set(ctx: Context, t: Task) {
        cancel(ctx, t.id)
        if (t.done || t.due <= System.currentTimeMillis()) return
        val am = ctx.getSystemService(AlarmManager::class.java)
        val p = pi(ctx, t.id)
        try {
            if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t.due, p)
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t.due, p)
        } catch (e: SecurityException) { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t.due, p) }
    }
    fun syncAll(ctx: Context) { Store.tasks.forEach { set(ctx, it) } }
}
