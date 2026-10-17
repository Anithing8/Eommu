package com.anithing.eommu

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    private val askNotify = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val crashPrefs = getSharedPreferences("eommu_crash", MODE_PRIVATE)
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { th, e ->
            crashPrefs.edit().putString("trace", android.util.Log.getStackTraceString(e).take(3500)).commit()
            previous?.uncaughtException(th, e)
        }
        enableEdgeToEdge()
        Store.init(this)
        Reminders.channel(this)
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) askNotify.launch(Manifest.permission.POST_NOTIFICATIONS)
        if (savedInstanceState == null) receiveShare(intent)
        Reminders.syncAll(this)
        setContent { EommuTheme { App() } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        receiveShare(intent)
    }

    /** Text shared from any app becomes a task in the current list. */
    private fun receiveShare(i: Intent?) {
        if (i?.action != Intent.ACTION_SEND) return
        val text = i.getStringExtra(Intent.EXTRA_TEXT)?.trim().orEmpty()
        val subject = i.getStringExtra(Intent.EXTRA_SUBJECT)?.trim().orEmpty()
        if (text.isEmpty() && subject.isEmpty()) return
        if (subject.isNotEmpty()) Store.addTask(subject, text)
        else Store.addTask(text.lines().first(), text.lines().drop(1).joinToString("\n"))
        Toast.makeText(this, "Added to Eommu", Toast.LENGTH_SHORT).show()
    }
}

@Composable
fun EommuTheme(content: @Composable () -> Unit) {
    val scheme = if (isSystemInDarkTheme()) darkColorScheme(
        primary = Color(0xFF8FC4A6), onPrimary = Color(0xFF10261B), background = Color(0xFF171614), onBackground = Color(0xFFECE7DD),
        surface = Color(0xFF1E1D1A), onSurface = Color(0xFFECE7DD), onSurfaceVariant = Color(0xFF9A9487), outlineVariant = Color(0xFF2F2D28),
        error = Color(0xFFE08A6F), secondaryContainer = Color(0xFF222D26), onSecondaryContainer = Color(0xFFECE7DD),
        surfaceContainer = Color(0xFF1E1D1A), surfaceContainerHigh = Color(0xFF1E1D1A), surfaceContainerHighest = Color(0xFF26241F), surfaceVariant = Color(0xFF26241F)
    ) else lightColorScheme(
        primary = Color(0xFF2D5A46), onPrimary = Color(0xFFF7F4EE), background = Color(0xFFF7F4EE), onBackground = Color(0xFF1F1D1A),
        surface = Color(0xFFFFFDF9), onSurface = Color(0xFF1F1D1A), onSurfaceVariant = Color(0xFF756F64), outlineVariant = Color(0xFFE2DCCF),
        error = Color(0xFFA4432B), secondaryContainer = Color(0xFFE6EEE8), onSecondaryContainer = Color(0xFF1F1D1A),
        surfaceContainer = Color(0xFFFFFDF9), surfaceContainerHigh = Color(0xFFFFFDF9), surfaceContainerHighest = Color(0xFFF1ECE1), surfaceVariant = Color(0xFFF1ECE1)
    )
    MaterialTheme(colorScheme = scheme, content = content)
}

sealed interface Dlg {
    object NewList : Dlg
    object Rename : Dlg
    object DeleteList : Dlg
    object CopyFrom : Dlg
    data class Edit(val id: String) : Dlg
}

private fun fmt(ms: Long): String = SimpleDateFormat("EEE d MMM, h:mm a", Locale.getDefault()).format(Date(ms))

private fun pickDateTime(ctx: Context, cur: Long, onPick: (Long) -> Unit) {
    val c = Calendar.getInstance().apply { if (cur > 0) timeInMillis = cur }
    android.app.DatePickerDialog(ctx, { _, y, m, d ->
        android.app.TimePickerDialog(ctx, { _, hh, mm ->
            onPick(Calendar.getInstance().apply { set(y, m, d, hh, mm, 0); set(Calendar.MILLISECOND, 0) }.timeInMillis)
        }, c.get(Calendar.HOUR_OF_DAY), c.get(Calendar.MINUTE), false).show()
    }, c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)).show()
}

@Composable
fun App() {
    val ctx = LocalContext.current
    val cs = MaterialTheme.colorScheme
    val scope = rememberCoroutineScope()
    val snack = remember { SnackbarHostState() }
    var dlg by remember { mutableStateOf<Dlg?>(null) }
    var menu by remember { mutableStateOf(false) }
    var text by remember { mutableStateOf("") }
    var showDone by remember { mutableStateOf(false) }
    var pending by remember { mutableStateOf(0L) }
    val list = Store.lists.firstOrNull { it.id == Store.cur } ?: Store.lists.first()

    fun say(m: String) { scope.launch { snack.currentSnackbarData?.dismiss(); snack.showSnackbar(m) } }
    fun undoable(msg: String, gone: List<Task>) {
        scope.launch {
            snack.currentSnackbarData?.dismiss()
            if (snack.showSnackbar(msg, "Undo") == SnackbarResult.ActionPerformed) Store.restore(ctx, gone)
        }
    }
    fun add() { Store.addTask(text, "", pending, ctx); text = ""; pending = 0L }

    val all = Store.tasks.filter { it.listId == Store.cur }
    val top = all.filter { it.parent.isEmpty() }
    val todo = top.filter { !it.done }.let { o ->
        when (Store.sort) {
            "due" -> o.sortedBy { if (it.due == 0L) Long.MAX_VALUE else it.due }
            "star" -> o.sortedByDescending { it.star }
            else -> o.sortedBy { it.created }
        }
    }
    val done = top.filter { it.done }
    val sortName = mapOf("added" to "Added", "due" to "Due date", "star" to "Starred")[Store.sort]
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    val greeting = when { hour < 12 -> "Good morning"; hour < 17 -> "Good afternoon"; else -> "Good evening" }
    val prog by animateFloatAsState(if (top.isEmpty()) 0f else done.size.toFloat() / top.size, label = "progress")

    Scaffold(
        snackbarHost = { SnackbarHost(snack) },
        containerColor = cs.background,
        bottomBar = {
            Column(Modifier.fillMaxWidth().background(cs.background).imePadding().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp)) {
                if (text.isNotBlank()) {
                    Row(Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (pending > 0) {
                            FilterChip(selected = true, onClick = { pending = 0L }, label = { Text(dueLabel(pending)) })
                        } else {
                            FilterChip(selected = false, onClick = { pending = System.currentTimeMillis() + 3600_000L }, label = { Text("In 1 hour") })
                            FilterChip(selected = false, onClick = {
                                pending = Calendar.getInstance().apply {
                                    add(Calendar.DAY_OF_YEAR, 1); set(Calendar.HOUR_OF_DAY, 9); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                                }.timeInMillis
                            }, label = { Text("Tomorrow 9 am") })
                            FilterChip(selected = false, onClick = { pickDateTime(ctx, 0) { pending = it } }, label = { Text("Pick date and time") })
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TextField(
                        value = text, onValueChange = { text = it }, singleLine = true, placeholder = { Text("Add a task") },
                        modifier = Modifier.weight(1f).border(1.dp, cs.outlineVariant, RoundedCornerShape(28.dp)),
                        shape = RoundedCornerShape(28.dp),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { add() }),
                        colors = TextFieldDefaults.colors(
                            focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent,
                            focusedContainerColor = cs.surface, unfocusedContainerColor = cs.surface)
                    )
                    Spacer(Modifier.width(10.dp))
                    Box(Modifier.size(54.dp).clip(CircleShape).background(cs.primary).clickable { add() }, contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Add, "Add task", tint = cs.onPrimary)
                    }
                }
            }
        }
    ) { pad ->
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
            LazyColumn(
                Modifier.widthIn(max = 640.dp).fillMaxHeight(),
                contentPadding = PaddingValues(20.dp, pad.calculateTopPadding() + 12.dp, 20.dp, pad.calculateBottomPadding() + 24.dp)
            ) {
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        LogoMark(40.dp, cs.primary)
                        Text("Eommu", fontFamily = FontFamily.Serif, fontSize = 20.sp, color = cs.onBackground)
                    }
                    Spacer(Modifier.height(14.dp))
                    Text(greeting, fontFamily = FontFamily.Serif, fontSize = 34.sp, color = cs.onBackground)
                    Text(SimpleDateFormat("EEEE, d MMMM", Locale.getDefault()).format(Date()), fontSize = 14.sp, color = cs.onSurfaceVariant)
                    Spacer(Modifier.height(22.dp))
                }
                item {
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Store.lists.forEach { l ->
                            val on = l.id == Store.cur
                            val n = Store.tasks.count { it.listId == l.id && it.parent.isEmpty() && !it.done }
                            val shape = RoundedCornerShape(50)
                            Row(
                                Modifier.clip(shape).background(if (on) cs.primary else Color.Transparent)
                                    .border(1.dp, if (on) cs.primary else cs.outlineVariant, shape)
                                    .clickable { Store.select(l.id) }.padding(horizontal = 16.dp, vertical = 9.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(l.name, maxLines = 1, fontSize = 14.sp, color = if (on) cs.onPrimary else cs.onSurface)
                                if (n > 0) {
                                    Spacer(Modifier.width(8.dp))
                                    Text("$n", fontSize = 12.sp, color = if (on) cs.onPrimary.copy(alpha = 0.75f) else cs.onSurfaceVariant)
                                }
                            }
                        }
                        TextButton(onClick = { dlg = Dlg.NewList }) { Text("+ New list") }
                    }
                    Spacer(Modifier.height(16.dp))
                }
                item {
                    val cardShape = RoundedCornerShape(20.dp)
                    Column(Modifier.fillMaxWidth().padding(bottom = 18.dp).clip(cardShape).background(cs.surface).border(1.dp, cs.outlineVariant, cardShape).padding(18.dp)) {
                        Row(verticalAlignment = Alignment.Top) {
                            Column(Modifier.weight(1f)) {
                                Text(list.name, fontFamily = FontFamily.Serif, fontSize = 26.sp, color = cs.onSurface)
                                Text(if (top.isEmpty()) "No tasks yet" else "${done.size} of ${top.size} done", color = cs.onSurfaceVariant, fontSize = 14.sp)
                            }
                            Box {
                                IconButton(onClick = { menu = true }) { Icon(Icons.Default.MoreVert, "List options", tint = cs.onSurfaceVariant) }
                                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                                    DropdownMenuItem(text = { Text("Rename list") }, onClick = { menu = false; dlg = Dlg.Rename })
                                    DropdownMenuItem(text = { Text("Copy from another list") }, onClick = {
                                        menu = false
                                        if (Store.lists.size < 2) say("Create a second list first, then copy from it") else dlg = Dlg.CopyFrom
                                    })
                                    DropdownMenuItem(text = { Text("Sort by: $sortName") }, onClick = { menu = false; Store.cycleSort() })
                                    DropdownMenuItem(text = { Text("Remove completed tasks") }, onClick = {
                                        menu = false
                                        val finished = all.filter { it.done }
                                        if (finished.isEmpty()) say("No completed tasks to remove")
                                        else undoable("${finished.size} completed removed", Store.remove(ctx, finished.map { it.id }.toSet()))
                                    })
                                    HorizontalDivider(color = cs.outlineVariant)
                                    DropdownMenuItem(text = { Text("Delete list", color = cs.error) }, onClick = {
                                        menu = false
                                        if (Store.lists.size < 2) say("Keep at least one list") else dlg = Dlg.DeleteList
                                    })
                                }
                            }
                        }
                        Spacer(Modifier.height(14.dp))
                        Box(Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(50)).background(cs.outlineVariant)) {
                            Box(Modifier.fillMaxWidth(prog).fillMaxHeight().background(cs.primary))
                        }
                    }
                }
                items(todo, key = { it.id }) { t ->
                    TaskBlock(t, { dlg = Dlg.Edit(it) }, { undoable("Task deleted", Store.remove(ctx, setOf(it.id))) })
                }
                if (todo.isEmpty()) item {
                    Column(Modifier.fillMaxWidth().padding(vertical = 32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        LogoMark(130.dp, cs.onSurfaceVariant.copy(alpha = 0.35f))
                        Text(if (done.isEmpty()) "A clear page." else "All done for now.",
                            fontFamily = FontFamily.Serif, fontStyle = FontStyle.Italic, fontSize = 18.sp, color = cs.onSurfaceVariant)
                    }
                }
                if (done.isNotEmpty()) {
                    item {
                        TextButton(onClick = { showDone = !showDone }, modifier = Modifier.padding(top = 8.dp)) {
                            Text((if (showDone) "– " else "+ ") + "COMPLETED (${done.size})", letterSpacing = 2.sp, fontSize = 12.sp, color = cs.onSurfaceVariant)
                        }
                    }
                    if (showDone) items(done, key = { it.id }) { t ->
                        TaskBlock(t, { dlg = Dlg.Edit(it) }, { undoable("Task deleted", Store.remove(ctx, setOf(it.id))) })
                    }
                }
            }
        }
    }

    var crash by remember { mutableStateOf(ctx.getSharedPreferences("eommu_crash", Context.MODE_PRIVATE).getString("trace", null)) }
    crash?.let { tr ->
        AlertDialog(
            onDismissRequest = {}, containerColor = cs.surface,
            title = { Text("Eommu closed unexpectedly", fontFamily = FontFamily.Serif) },
            text = {
                Column {
                    Text("Please copy this and send it to the developer.", fontSize = 13.sp, color = cs.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                    SelectionContainer {
                        Text(tr, fontFamily = FontFamily.Monospace, fontSize = 10.sp, modifier = Modifier.heightIn(max = 240.dp).verticalScroll(rememberScrollState()))
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    ctx.getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Eommu crash", tr))
                    say("Copied")
                }) { Text("Copy") }
            },
            dismissButton = {
                TextButton(onClick = {
                    ctx.getSharedPreferences("eommu_crash", Context.MODE_PRIVATE).edit().remove("trace").apply()
                    crash = null
                }) { Text("Dismiss") }
            }
        )
    }

    when (val d = dlg) {
        null -> {}
        Dlg.NewList -> NameDialog("New list", "", { dlg = null }) { Store.addList(it) }
        Dlg.Rename -> NameDialog("Rename list", list.name, { dlg = null }) { Store.renameList(list.id, it) }
        Dlg.DeleteList -> {
            val n = Store.tasks.count { it.listId == list.id }
            AlertDialog(
                onDismissRequest = { dlg = null }, containerColor = cs.surface,
                title = { Text("Delete this list?", fontFamily = FontFamily.Serif) },
                text = { Text("\"${list.name}\" and its $n task${if (n == 1) "" else "s"} will be removed. This cannot be undone.") },
                confirmButton = { Button(onClick = { Store.deleteList(ctx, list.id); dlg = null }, colors = ButtonDefaults.buttonColors(containerColor = cs.error)) { Text("Delete list", color = Color.White) } },
                dismissButton = { TextButton(onClick = { dlg = null }) { Text("Cancel") } }
            )
        }
        Dlg.CopyFrom -> CopyDialog({ dlg = null }) { say(it) }
        is Dlg.Edit -> Store.tasks.find { it.id == d.id }?.let { t ->
            EditDialog(t, { dlg = null }) { dlg = null; undoable("Task deleted", Store.remove(ctx, setOf(t.id))) }
        }
    }
}

private fun dueLabel(ms: Long): String {
    fun same(a: Calendar, b: Calendar) = a.get(Calendar.YEAR) == b.get(Calendar.YEAR) && a.get(Calendar.DAY_OF_YEAR) == b.get(Calendar.DAY_OF_YEAR)
    val due = Calendar.getInstance().apply { timeInMillis = ms }
    val tomorrow = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, 1) }
    val time = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(ms))
    return when {
        same(Calendar.getInstance(), due) -> "Today, $time"
        same(tomorrow, due) -> "Tomorrow, $time"
        else -> fmt(ms)
    }
}

@Composable
fun LogoMark(box: Dp, color: Color) {
    Canvas(Modifier.size(box)) {
        val k = size.minDimension / 108f
        val st = Stroke(width = 5.9f * k, cap = StrokeCap.Round, join = StrokeJoin.Round)
        drawArc(color, -20f, 310f, false, Offset(26.6f * k, 27.9f * k), Size(54.8f * k, 54.8f * k), style = st)
        val p = Path().apply { moveTo(41.3f * k, 56.5f * k); lineTo(51.5f * k, 67.1f * k); lineTo(78.4f * k, 34.6f * k) }
        drawPath(p, color, style = st)
    }
}

@Composable
fun Pill(text: String, color: Color) {
    Text(text, fontSize = 11.sp, color = color,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(color.copy(alpha = 0.12f)).padding(horizontal = 9.dp, vertical = 3.dp))
}

@Composable
fun TaskBlock(t: Task, onEdit: (String) -> Unit, onDelete: (Task) -> Unit) {
    val cs = MaterialTheme.colorScheme
    val subs = Store.tasks.filter { it.parent == t.id }.sortedBy { it.created }
    val shape = RoundedCornerShape(18.dp)
    Column(Modifier.fillMaxWidth().padding(bottom = 10.dp).clip(shape).background(cs.surface).border(1.dp, cs.outlineVariant, shape).animateContentSize()) {
        TaskRow(t, subs, false, { onEdit(t.id) }, { onDelete(t) })
        subs.forEach { c ->
            HorizontalDivider(Modifier.padding(start = 44.dp), color = cs.outlineVariant)
            TaskRow(c, emptyList(), true, { onEdit(c.id) }, { onDelete(c) })
        }
    }
}

@Composable
fun TaskRow(t: Task, subs: List<Task>, sub: Boolean, onEdit: () -> Unit, onDelete: () -> Unit) {
    val ctx = LocalContext.current
    val cs = MaterialTheme.colorScheme
    val late = !t.done && t.due > 0 && t.due < System.currentTimeMillis()
    val label = if (t.due > 0) dueLabel(t.due) else ""
    val fillC by animateColorAsState(if (t.done) cs.primary else Color.Transparent, label = "fill")
    val lineC by animateColorAsState(if (t.done) cs.primary else cs.onSurfaceVariant, label = "line")
    val textC by animateColorAsState(if (t.done) cs.onSurfaceVariant else cs.onSurface, label = "text")
    val extra = listOfNotNull(
        if (subs.isNotEmpty()) "${subs.count { it.done }} of ${subs.size} subtasks" else null,
        if (t.notes.isNotEmpty()) "notes" else null
    ).joinToString(" · ")
    Row(Modifier.fillMaxWidth().padding(start = if (sub) 34.dp else 6.dp, end = 2.dp, top = 2.dp, bottom = 2.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(40.dp).clip(CircleShape).clickable { Store.toggle(ctx, t.id) }, contentAlignment = Alignment.Center) {
            Box(
                Modifier.size(if (sub) 20.dp else 24.dp).clip(CircleShape).background(fillC).border(1.6.dp, lineC, CircleShape),
                contentAlignment = Alignment.Center
            ) { if (t.done) Icon(Icons.Default.Check, "Done", Modifier.size(12.dp), tint = cs.onPrimary) }
        }
        Column(Modifier.weight(1f).clickable(onClick = onEdit).padding(horizontal = 6.dp, vertical = 8.dp)) {
            Text(t.title, fontSize = if (sub) 15.sp else 16.sp, color = textC, textDecoration = if (t.done) TextDecoration.LineThrough else null)
            if (t.due > 0 || t.repeat.isNotEmpty()) Row(Modifier.padding(top = 5.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (t.due > 0) Pill(label, if (late) cs.error else if (label.startsWith("Today")) cs.primary else cs.onSurfaceVariant)
                if (t.repeat.isNotEmpty()) Pill("repeats ${t.repeat}", cs.onSurfaceVariant)
            }
            if (extra.isNotEmpty()) Text(extra, fontSize = 12.sp, color = cs.onSurfaceVariant, modifier = Modifier.padding(top = 3.dp))
        }
        if (!sub) IconButton(onClick = { Store.update(ctx, t.copy(star = !t.star)) }) {
            Icon(Icons.Default.Star, if (t.star) "Remove star" else "Star task", tint = if (t.star) Color(0xFFB7791F) else cs.outlineVariant)
        }
        IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, "Delete task", tint = cs.onSurfaceVariant) }
    }
}

@Composable
fun NameDialog(title: String, initial: String, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var v by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface,
        title = { Text(title, fontFamily = FontFamily.Serif) },
        text = { OutlinedTextField(value = v, onValueChange = { v = it.take(40) }, singleLine = true) },
        confirmButton = { Button(onClick = { if (v.isNotBlank()) { val name = v.trim(); onDismiss(); onSave(name) } }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun EditDialog(t: Task, onDismiss: () -> Unit, onDelete: () -> Unit) {
    val ctx = LocalContext.current
    val cs = MaterialTheme.colorScheme
    val isSub = t.parent.isNotEmpty()
    var title by remember { mutableStateOf(t.title) }
    var notes by remember { mutableStateOf(t.notes) }
    var due by remember { mutableStateOf(t.due) }
    var rep by remember { mutableStateOf(t.repeat) }
    var lid by remember { mutableStateOf(t.listId) }
    var newSub by remember { mutableStateOf("") }
    val subs = Store.tasks.filter { it.parent == t.id }.sortedBy { it.created }
    AlertDialog(
        onDismissRequest = onDismiss, containerColor = cs.surface,
        title = { Text(if (isSub) "Edit subtask" else "Edit task", fontFamily = FontFamily.Serif) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(title, { title = it }, label = { Text("Title") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(notes, { notes = it }, label = { Text("Details") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                if (!isSub) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedButton(onClick = { pickDateTime(ctx, due) { due = it } }) { Text(if (due > 0) fmt(due) else "Set due date and time") }
                        if (due > 0) TextButton(onClick = { due = 0; rep = "" }) { Text("Clear") }
                    }
                    if (due > 0) Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("", "daily", "weekly", "monthly").forEach { r ->
                            FilterChip(selected = rep == r, onClick = { rep = r }, label = { Text(if (r.isEmpty()) "No repeat" else r.replaceFirstChar { it.uppercase() }) })
                        }
                    }
                    if (Store.lists.size > 1) {
                        Text("List", fontSize = 12.sp, color = cs.onSurfaceVariant)
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Store.lists.forEach { l -> FilterChip(selected = lid == l.id, onClick = { lid = l.id }, label = { Text(l.name) }) }
                        }
                    }
                    Text("Subtasks", fontSize = 12.sp, color = cs.onSurfaceVariant)
                    subs.forEach { c ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(c.title, Modifier.weight(1f), textDecoration = if (c.done) TextDecoration.LineThrough else null,
                                color = if (c.done) cs.onSurfaceVariant else cs.onSurface)
                            IconButton(onClick = { Store.remove(ctx, setOf(c.id)) }) { Icon(Icons.Default.Delete, "Delete subtask", tint = cs.onSurfaceVariant) }
                        }
                    }
                    OutlinedTextField(
                        value = newSub, onValueChange = { newSub = it }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Add a subtask") },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { Store.addSub(t.id, newSub); newSub = "" }),
                        trailingIcon = { IconButton(onClick = { Store.addSub(t.id, newSub); newSub = "" }) { Icon(Icons.Default.Add, "Add subtask", tint = cs.primary) } }
                    )
                }
            }
        },
        confirmButton = {
            Button(onClick = {
                if (title.isNotBlank()) {
                    if (newSub.isNotBlank()) Store.addSub(t.id, newSub)
                    val fresh = Store.tasks.find { it.id == t.id } ?: t
                    Store.update(ctx, fresh.copy(title = title.trim(), notes = notes.trim(), due = due, repeat = if (due > 0) rep else "", listId = lid))
                    onDismiss()
                }
            }) { Text("Save") }
        },
        dismissButton = {
            Row {
                TextButton(onClick = onDelete) { Text("Delete", color = cs.error) }
                TextButton(onClick = onDismiss) { Text("Cancel") }
            }
        }
    )
}

@Composable
fun CopyDialog(onDismiss: () -> Unit, onDone: (String) -> Unit) {
    val ctx = LocalContext.current
    val others = Store.lists.filter { it.id != Store.cur }
    var src by remember { mutableStateOf(others.first().id) }
    var picked by remember { mutableStateOf(setOf<String>()) }
    var move by remember { mutableStateOf(false) }
    val avail = Store.tasks.filter { it.listId == src && it.parent.isEmpty() }
    LaunchedEffect(src) { picked = Store.tasks.filter { it.listId == src && it.parent.isEmpty() && !it.done }.map { it.id }.toSet() }
    AlertDialog(
        onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface,
        title = { Text("Copy tasks here", fontFamily = FontFamily.Serif) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    others.forEach { l -> FilterChip(selected = src == l.id, onClick = { src = l.id }, label = { Text(l.name) }) }
                }
                Column(Modifier.heightIn(max = 260.dp).verticalScroll(rememberScrollState())) {
                    if (avail.isEmpty()) Text("No tasks in this list", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    avail.forEach { t ->
                        Row(Modifier.fillMaxWidth().clickable { picked = if (t.id in picked) picked - t.id else picked + t.id }.padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = t.id in picked, onCheckedChange = null)
                            Spacer(Modifier.width(12.dp)); Text(t.title)
                        }
                    }
                }
                Row(Modifier.fillMaxWidth().clickable { move = !move }, verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = move, onCheckedChange = null)
                    Spacer(Modifier.width(12.dp)); Text("Move instead of copying", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        },
        confirmButton = {
            Button(onClick = {
                if (picked.isEmpty()) {
                    onDone("Pick at least one task")
                } else {
                    val (n, s) = Store.copyFrom(ctx, picked, move)
                    onDone("$n copied" + if (s > 0) ", $s skipped (same title)" else "")
                    onDismiss()
                }
            }) { Text("Copy here") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
