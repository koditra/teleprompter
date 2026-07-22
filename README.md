# Simple Teleprompter

A simple browser-based teleprompter for recording videos without forgetting your script.

I originally made this because most online teleprompters either have ads, require an account, or upload your recordings somewhere. I wanted something that is private and i can trust! :)

## Screenshots

<img width="1504" height="764" alt="Screenshot 2026-07-22 at 12 05 39 PM" src="https://github.com/user-attachments/assets/82011302-7852-4249-a697-cada15b5f127" />

<img width="1504" height="764" alt="Screenshot 2026-07-22 at 12 05 54 PM" src="https://github.com/user-attachments/assets/e680d809-84f4-4e30-889b-81662a1ae7da" />

## Features

- scrolling script with changeable speed
- Adjustable font size
- Fullscreen mode
- Mirror mode for real teleprompter glass
- Record directly in the browser
- Export recordings as MP4
- all processing runs locally 

## Built With

- HTML
- CSS
- JavaScript
- FFmpeg.wasm

## What Was Challenging?

The hardest part by far was getting FFmpeg running in the browser. I kept running into import issues, missing worker files, browser security restrictions, and random errors while trying to import and use it.

Another annoying bug was accidentally recording the teleprompter text onto the exported video instead of just the camera feed, but after some debugging I managed to fix it.

## Running Locally

Clone the repository:

```bash
git clone https://github.com/yourusername/simple-teleprompter.git
```

Open the project folder and serve it with any local web server.

For example:

```bash
python -m http.server
```

or

```bash
npx serve
```

Then open the local URL in your browser.

## Future Ideas

- More UI themes
- Native iOS and Android app
- Desktop app for Windows, macOS, and Linux

## Thanks

Thanks to everyone who gave feedback while I was building this project. It helped make me v motivated :)
