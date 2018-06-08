Make sure server is running, `nodemon server/index.js` from the root.
Server is configured to run on port 3000

Start up ngrok: `ngrok http 3000`

Ngrok changes the baseUrl on each startup, so you'll have to update your facebook messenger webhooks callback url for your messenger app whenever you restart it. This can be done via 'edit subscriptions' [on this page](https://developers.facebook.com/apps/1839348233033683/webhooks/)

[Facebook messenger quickstart](https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start)

If the page messenger is not pinging the server try this [SO thread](https://stackoverflow.com/questions/36803570/facebook-messenger-webhook-setup-but-not-triggered?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa)

Especially, make sure the app is connected to the page, do this with a curl request `curl -X POST "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=PAGE_ACCESS_TOKEN"`. Looks like this has to be done everytime the server restarts or the Ngrok url is changed.

Make sure in [facebook developer dashboard](https://developers.facebook.com/apps/1839348233033683/messenger/settings/), under webhooks, messages_echos is deselected, otherwise there will be a reciepient ID error when a messages_echos webhook is sent.

Set up a .env file with the following:

```
PAGE_ACCESS_TOKEN=
VERIFY_TOKEN=
FORM_ID=<TYPEFORM_FORM_ID>
```

 Page access token you get from [facebook developer](https://developers.facebook.com/apps/1839348233033683/messenger/settings/) under token generation. Select a page and a random token will be generated. You then need to subscribe with the curl request above.

Verify token is something you create. Can be anything, 'i love cupcakes' or some uuid, whatever. You set this in the facebook developer dashboard. [Products> webhooks> edit subscription](https://developers.facebook.com/apps/1839348233033683/webhooks/) where you can update the ngrok host and the verify token.

The [bot lives here](https://www.facebook.com/typeform.messenger). You need to say hi to start the conversation.

To-do:
1. Complete the suite of functions to translate all TF questions types to FB question types.
2. Abstract the functions for handling messages and postbacks from the FB hooks.