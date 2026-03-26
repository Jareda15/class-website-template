import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { buildPushPayload } from '@block65/webcrypto-web-push';

const app = new Hono();
// MAKE SURE TO CHANGE THIS TO THE ACTUAL DOMAIN THE TEMPLATE WILL BE HOSTED ON
app.use('/*', cors({ origin: 'https://YOUR_WEBSITE_DOMAIN' }));

// Basic API route to verify it's working
app.get('/', (c) => c.text('Class Web Push Worker is running!'));

// Subscribe a new user
app.post('/api/subscribe', async (c) => {
    try {
        const bodyText = await c.req.text();
        if (bodyText.length > 3000) {
            return c.json({ error: 'Payload too large' }, 400);
        }
        const subscription = JSON.parse(bodyText);
        if (!subscription || !subscription.endpoint || typeof subscription.endpoint !== 'string') {
            return c.json({ error: 'Invalid subscription object' }, 400);
        }
        // Store in KV using the endpoint URL as the unique key
        await c.env.SUBSCRIPTIONS.put(subscription.endpoint, JSON.stringify(subscription));
        return c.json({ success: true });
    } catch (e) {
        return c.json({ error: e.message }, 500);
    }
});

// Unsubscribe
app.post('/api/unsubscribe', async (c) => {
    try {
        const { endpoint } = await c.req.json();
        if (!endpoint || typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
            return c.json({ error: 'Invalid endpoint' }, 400);
        }
        await c.env.SUBSCRIPTIONS.delete(endpoint);
        return c.json({ success: true, message: 'Unsubscribed successfully!' });
    } catch (e) {
        return c.json({ error: e.message }, 500);
    }
});

// Helper function to verify admin access
const checkAdmin = (c) => {
    const secret = c.req.query('secret');
    const expectedSecret = c.env.ADMIN_SECRET;
    return expectedSecret && secret === expectedSecret;
};

// Universal function to send a Push Notification with high priority
async function sendWebPush(subscription, payloadString, env) {
    const pushMessage = {
        data: payloadString,
        options: {
            urgency: 'high',
            ttl: 86400
        }
    };

    const payload = await buildPushPayload(
        pushMessage,
        subscription,
        {
            subject: env.VAPID_SUBJECT,
            publicKey: env.VAPID_PUBLIC_KEY,
            privateKey: env.VAPID_PRIVATE_KEY
        }
    );

    const res = await fetch(subscription.endpoint, {
        method: 'POST',
        body: payload.body,
        headers: payload.headers,
    });

    if (!res.ok) {
        throw new Error(`Push failed: ${res.status} ${await res.text()}`);
    }
    return res;
}

// TEST ENDPOINT - Send notification to everyone immediately
app.get('/api/test-push', async (c) => {
    if (!checkAdmin(c)) return c.text('Unauthorized: Missing or invalid secret parameter.', 401);
    try {
        const testPayload = JSON.stringify({
            title: 'Push test',
            body: 'Just a test, nothing more',
            icon: 'YOUR_ICON_URL_HERE',
            url: '/'
        });

        let cursor = "";
        let sentCount = 0;

        do {
            const list = await c.env.SUBSCRIPTIONS.list({ cursor });
            for (let key of list.keys) {
                if (key.name === 'DEBUG_LOG') continue;

                const subStr = await c.env.SUBSCRIPTIONS.get(key.name);
                if (subStr) {
                    try {
                        await sendWebPush(JSON.parse(subStr), testPayload, c.env);
                        sentCount++;
                    } catch (err) {
                        try {
                            if (err.message && (err.message.includes('410') || err.message.includes('404'))) {
                                await c.env.SUBSCRIPTIONS.delete(key.name);
                                let logStr = (await c.env.SUBSCRIPTIONS.get('DEBUG_LOG')) || '';
                                logStr = (new Date().toISOString() + ' -> DELETED EXPIRED SUB: ' + key.name + '\n' + logStr).substring(0, 2000);
                                await c.env.SUBSCRIPTIONS.put('DEBUG_LOG', logStr);
                            } else {
                                let logStr = (await c.env.SUBSCRIPTIONS.get('DEBUG_LOG')) || '';
                                logStr = (new Date().toISOString() + ' -> FCM ERROR: ' + err.message + '\n' + logStr).substring(0, 2000);
                                await c.env.SUBSCRIPTIONS.put('DEBUG_LOG', logStr);
                            }
                        } catch (e) { }
                        console.error("Test push failed for a user:", err);
                    }
                }
            }
            cursor = list.list_complete ? "" : list.cursor;
        } while (cursor);

        return c.text(`Successfully sent to ${sentCount} devices! 🎉 Check your phone/PC!`);
    } catch (e) {
        return c.text(`Error: ${e.message}`, 500);
    }
});

// CRON Trigger Handler (Automatic checking for tests)
async function handleScheduledEvent(event, env, ctx) {
    console.log("CRON Trigger started.");

    // 1. Fetch CSV data
    const csvUrl = 'YOUR_GOOGLE_SHEETS_CSV_URL_FOR_UPCOMING_TESTS';
    let upcomingTests = [];
    try {
        const response = await fetch(csvUrl);
        const text = await response.text();
        const rows = text.split('\n').map(row => row.split(',').map(c => c.replace(/^"|"$/g, '').trim()));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < 2) continue;

            let dateStr = row[0];
            let dateParts = dateStr.split('.');
            if (dateParts.length < 2) continue;

            let d = parseInt(dateParts[0].trim());
            let m = parseInt(dateParts[1].trim()) - 1;
            let y = dateParts[2] && dateParts[2].trim() !== "" ? parseInt(dateParts[2].trim()) : new Date().getFullYear();

            let testDate = new Date(y, m, d);

            // Check if test is EXACTLY tomorrow
            if (testDate.getTime() === tomorrow.getTime()) {
                upcomingTests.push(row[1]);
            }
        }
    } catch (e) {
        console.error("Failed to fetch CSV:", e);
        return;
    }

    if (upcomingTests.length === 0) {
        console.log("No tests tomorrow. Doing nothing.");
        return;
    }

    // 2. Prepare payload
    const testNames = upcomingTests.join(' and ');
    const notificationPayload = JSON.stringify({
        title: '📝 Test tomorrow!',
        body: `Don't forget to study, tomorrow we have a test in: ${testNames}.`,
        icon: 'YOUR_ICON_URL_HERE',
        url: '/'
    });

    // 3. Fetch all subscriptions from KV and send notifications
    let cursor = "";
    let sentCount = 0;
    let errCount = 0;

    do {
        const list = await env.SUBSCRIPTIONS.list({ cursor });

        for (let key of list.keys) {
            try {
                const subStr = await env.SUBSCRIPTIONS.get(key.name);
                if (!subStr) continue;

                await sendWebPush(JSON.parse(subStr), notificationPayload, env);
                sentCount++;
            } catch (err) {
                if (err.message.includes('410') || err.message.includes('404')) {
                    await env.SUBSCRIPTIONS.delete(key.name);
                    console.log("Deleted expired subscription:", key.name);
                } else {
                    console.error("Error sending push:", err);
                    errCount++;
                }
            }
        }

        cursor = list.list_complete ? "" : list.cursor;
    } while (cursor);

    console.log(`Finished sending pushes. Sent: ${sentCount}, Errors: ${errCount}`);
}

export default {
    fetch: app.fetch,
    scheduled: handleScheduledEvent
};