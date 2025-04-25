# Transcript Saving Functionality

This document describes the transcript saving functionality implemented in the OpenAI backend.

## Overview

The `/api/save-transcript` endpoint allows for saving conversation transcripts, function calls, and audio clips in both human-readable text format and structured JSON format. The data is organized chronologically and saved in session-specific folders.

## Session Organization

Each time the endpoint is called, a new session folder is created with an incrementing counter as the session ID:

```
backend/transcripts/
├── session_counter.json    # Keeps track of the current session counter
├── session_1/              # First session
│   ├── transcript.txt
│   ├── transcript.json
│   ├── function_call_transcript.txt
│   ├── function_call_transcript.json
│   ├── raw_payload.json
│   ├── user_audio/         # Directory containing user audio clips
│   │   ├── user_audio_1_1714185600000.webm
│   │   ├── user_audio_2_1714185700000.webm
│   │   └── metadata.json
│   └── ai_audio/           # Directory containing AI audio clips
│       ├── ai_audio_1_1714185650000.pcm
│       ├── ai_audio_2_1714185750000.pcm
│       └── metadata.json
├── session_2/              # Second session
│   ├── ...
└── ...
```

## Files Generated

For each session, the following files and directories are generated:

1. `transcript.txt` - Human-readable version of the conversation transcript in chronological order
2. `transcript.json` - Structured JSON data of the conversation transcript
3. `function_call_transcript.txt` - Human-readable version of function calls in chronological order
4. `function_call_transcript.json` - Structured JSON data of function calls
5. `raw_payload.json` - Unmodified original request payload as received by the server
6. `user_audio/` - Directory containing user audio recordings
   - Individual audio files in .webm format with timestamps in filenames
   - `metadata.json` with details about each audio clip
7. `ai_audio/` - Directory containing AI audio responses
   - Individual audio files in .pcm format with timestamps in filenames
   - `metadata.json` with details about each audio clip

## Audio Metadata Format

Each audio directory contains a metadata.json file with information about the audio clips:

```json
[
  {
    "index": 1,
    "timestamp": "2025-04-26T10:15:30.123Z",
    "formattedTimestamp": "2025-04-26T10:15:30.123Z",
    "filename": "user_audio_1_1714185600000.webm"
  },
  {
    "index": 2,
    "timestamp": "2025-04-26T10:16:45.456Z",
    "formattedTimestamp": "2025-04-26T10:16:45.456Z", 
    "filename": "user_audio_2_1714185700000.webm"
  }
]
```

## Usage

To save a transcript with audio, send a POST request to `/api/save-transcript` with the following JSON body:

```json
{
  "transcript": [
    {
      "role": "assistant",
      "content": "Hello, how can I help you today?",
      "timestamp": "2025-04-26T10:15:30.123Z"
    },
    {
      "role": "user",
      "content": "I'd like to make a reservation",
      "timestamp": "2025-04-26T10:15:45.456Z"
    }
  ],
  "functionCalls": [
    {
      "timestamp": "2025-04-26T10:15:40.111Z",
      "functionName": "logUserIntent",
      "arguments": {
        "intent": "make_reservation"
      },
      "callId": "call_123456"
    }
  ],
  "userAudioClips": [
    {
      "timestamp": "2025-04-26T10:15:45.456Z",
      "audioData": "base64EncodedAudioData..."
    }
  ],
  "aiAudioClips": [
    {
      "timestamp": "2025-04-26T10:15:30.123Z",
      "audioData": "base64EncodedAudioData..."
    }
  ],
  "sessionData": {
    "sessionId": "unique-session-id",
    "timestamp": "2025-04-26T10:15:25.000Z",
    "sessionStartTime": "2025-04-26T10:15:25.000Z",
    "sessionEndTime": "2025-04-26T10:17:00.000Z"
  }
}
```

## Response

The endpoint will respond with:

```json
{
  "success": true,
  "message": "Transcript and audio saved successfully",
  "sessionId": 3,
  "sessionDir": "session_3"
}
```

## Testing

You can test the functionality using the provided test script:

```bash
node backend/test_transcript_save.js
```

Make sure the server is running before executing the test script. 