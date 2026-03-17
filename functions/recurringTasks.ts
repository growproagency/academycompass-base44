Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');
    // Use service role key if available, fall back to anon (anon won't bypass RLS)
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseKey;

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    const todayStr = new Date().toISOString().split('T')[0];
    console.log(`[RecurringTasks] Running for today: ${todayStr}`);

    // Fetch all non-archived tasks — filter in code to handle different possible column names
    const tasksRes = await fetch(
      `${supabaseUrl}/rest/v1/tasks?archived_at=is.null&select=*`,
      { headers }
    );

    if (!tasksRes.ok) {
      const err = await tasksRes.text();
      console.error(`Failed to fetch tasks: ${err}`);
      return Response.json({ error: `Failed to fetch tasks: ${err}` }, { status: 500 });
    }

    const allTasks = await tasksRes.json();

    // Determine the repeat column name dynamically from the first task
    const sampleTask = allTasks[0] || {};
    const repeatCol = 'repeat_frequency' in sampleTask ? 'repeat_frequency'
                    : 'repeat' in sampleTask ? 'repeat'
                    : null;

    console.log(`[RecurringTasks] Using repeat column: "${repeatCol}", total tasks fetched: ${allTasks.length}`);

    if (!repeatCol) {
      return Response.json({ error: 'Could not determine repeat column name', sampleKeys: Object.keys(sampleTask) }, { status: 500 });
    }

    // Filter to recurring tasks only
    const tasks = allTasks.filter(t => t[repeatCol] && t[repeatCol] !== 'none');
    console.log(`[RecurringTasks] Found ${tasks.length} recurring task(s)`);

    const results = [];

    for (const task of tasks) {
      if (!task.due_date) {
        console.log(`[RecurringTasks] Task "${task.title}" has no due_date, skipping`);
        continue;
      }

      const dueDate = new Date(task.due_date + 'T00:00:00Z');
      const today = new Date(todayStr + 'T00:00:00Z');

      // Only process tasks whose due_date is today or in the past
      if (dueDate > today) {
        console.log(`[RecurringTasks] Task "${task.title}" due ${task.due_date} is in the future, skipping`);
        continue;
      }

      // Advance nextDue by frequency until it is strictly in the future (after today)
      const nextDue = new Date(dueDate);
      const freq = task[repeatCol];

      if (freq === 'daily') {
        while (nextDue <= today) nextDue.setDate(nextDue.getDate() + 1);
      } else if (freq === 'weekly') {
        while (nextDue <= today) nextDue.setDate(nextDue.getDate() + 7);
      } else if (freq === 'bi-weekly') {
        while (nextDue <= today) nextDue.setDate(nextDue.getDate() + 14);
      } else if (freq === 'monthly') {
        while (nextDue <= today) nextDue.setMonth(nextDue.getMonth() + 1);
      } else {
        console.log(`[RecurringTasks] Unknown frequency "${freq}" for task "${task.title}", skipping`);
        continue;
      }

      const nextDueStr = nextDue.toISOString().split('T')[0];
      console.log(`[RecurringTasks] Task "${task.title}" (${task.id}): next occurrence → ${nextDueStr}`);

      // Duplicate check
      const dupRes = await fetch(
        `${supabaseUrl}/rest/v1/tasks?title=eq.${encodeURIComponent(task.title)}&organization_id=eq.${task.organization_id}&due_date=eq.${nextDueStr}&archived_at=is.null&select=id`,
        { headers }
      );
      const dups = await dupRes.json();
      if (Array.isArray(dups) && dups.length > 0) {
        console.log(`[RecurringTasks] Duplicate already exists for "${task.title}" on ${nextDueStr}, skipping`);
        continue;
      }

      // Create next occurrence — same details, new due_date, status reset to "todo"
      const newTask = {
        title: task.title,
        description: task.description || null,
        notes: task.notes || null,
        status: 'todo',
        priority: task.priority || 'medium',
        due_date: nextDueStr,
        assigned_to: task.assigned_to || null,
        assignee_email: task.assignee_email || null,
        rock_id: task.rock_id || null,
        organization_id: task.organization_id,
        created_by: task.created_by || null,
        [repeatCol]: freq,
      };

      const createRes = await fetch(`${supabaseUrl}/rest/v1/tasks`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(newTask),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error(`[RecurringTasks] Failed to create task for "${task.title}": ${err}`);
        results.push({ original_id: task.id, status: 'error', error: err });
      } else {
        const created = await createRes.json();
        console.log(`[RecurringTasks] Created new task ${created[0]?.id} from original ${task.id} (due: ${nextDueStr})`);
        results.push({ original_id: task.id, new_id: created[0]?.id, status: 'created', due_date: nextDueStr });
      }
    }

    return Response.json({
      success: true,
      processed: tasks.length,
      created: results.filter(r => r.status === 'created').length,
      results,
      repeatColumn: repeatCol,
    });
  } catch (error) {
    console.error('[RecurringTasks] Unexpected error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});