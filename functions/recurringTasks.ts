import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    // Today's date string in YYYY-MM-DD (UTC)
    const todayStr = today.toISOString().split('T')[0];

    // Use service role to access all orgs
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');

    // Fetch all tasks with a repeat value that is not "none" and not archived
    const tasksRes = await fetch(
      `${supabaseUrl}/rest/v1/tasks?repeat=neq.none&archived_at=is.null&select=*`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tasksRes.ok) {
      const err = await tasksRes.text();
      return Response.json({ error: `Failed to fetch tasks: ${err}` }, { status: 500 });
    }

    const tasks = await tasksRes.json();
    console.log(`Found ${tasks.length} recurring tasks`);

    const results = [];

    for (const task of tasks) {
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      if (!dueDate) continue;

      // Calculate the next due date based on repeat frequency
      const nextDue = new Date(dueDate);
      const repeat = task.repeat;

      if (repeat === 'daily') {
        nextDue.setDate(nextDue.getDate() + 1);
      } else if (repeat === 'weekly') {
        nextDue.setDate(nextDue.getDate() + 7);
      } else if (repeat === 'bi-weekly') {
        nextDue.setDate(nextDue.getDate() + 14);
      } else if (repeat === 'monthly') {
        nextDue.setMonth(nextDue.getMonth() + 1);
      } else {
        continue;
      }

      const nextDueStr = nextDue.toISOString().split('T')[0];

      // Only create if the next due date is today (we run at 8am EST = day of next due)
      if (nextDueStr !== todayStr) {
        console.log(`Task ${task.id} next due ${nextDueStr} != today ${todayStr}, skipping`);
        continue;
      }

      // Check if a task with the same title, org, and due_date already exists today (avoid duplicates)
      const dupCheckRes = await fetch(
        `${supabaseUrl}/rest/v1/tasks?title=eq.${encodeURIComponent(task.title)}&organization_id=eq.${task.organization_id}&due_date=eq.${nextDueStr}&archived_at=is.null&select=id`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      const dups = await dupCheckRes.json();
      if (dups.length > 0) {
        console.log(`Duplicate found for task "${task.title}" on ${nextDueStr}, skipping`);
        continue;
      }

      // Create the new task with same details but updated due_date, reset status to "todo"
      const newTask = {
        title: task.title,
        description: task.description || null,
        notes: task.notes || null,
        status: 'todo',
        priority: task.priority || 'medium',
        due_date: nextDueStr,
        assigned_to: task.assigned_to || null,
        rock_id: task.rock_id || null,
        organization_id: task.organization_id,
        created_by: task.created_by || null,
        repeat: task.repeat,
      };

      const createRes = await fetch(`${supabaseUrl}/rest/v1/tasks`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(newTask),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error(`Failed to create recurring task for ${task.id}: ${err}`);
        results.push({ original_id: task.id, status: 'error', error: err });
      } else {
        const created = await createRes.json();
        console.log(`Created recurring task: ${created[0]?.id} from original: ${task.id}`);
        results.push({ original_id: task.id, new_id: created[0]?.id, status: 'created', due_date: nextDueStr });
      }
    }

    return Response.json({
      success: true,
      processed: tasks.length,
      created: results.filter(r => r.status === 'created').length,
      results,
    });
  } catch (error) {
    console.error('recurringTasks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});