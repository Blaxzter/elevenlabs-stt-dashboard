# ElevenLabs STT Dashboard - Task List

## Phase 1: Project Setup & Dependencies

- [x] Install shadcn-vue components (button, input, card, switch, etc.)
- [x] Install axios for API requests
- [x] Install lucide-vue for icons
- [x] Set up Vue Router for navigation
- [x] Create basic project structure

## Phase 2: Core Components

- [x] Create AudioFileInput component (audio file upload only)
- [x] Create ApiKeyInput component (secure input for API key)
- [x] Create TranscriptionOutput component (text/JSON toggle)
- [x] Create ProcessingIndicator component (loading states)
- [x] Create TranscriptionCard component (for list/overview)
- [x] Create AudioPlayer component (with text sync)

## Phase 3: Data Management

- [x] Set up IndexedDB for storing transcriptions
- [x] Create service for audio file caching (blob storage)
- [x] Create ElevenLabs API service with axios
- [x] Create transcription store/composable
- [x] Implement local storage for API key

## Phase 4: Main Views

- [x] Create Home/Dashboard view
  - [x] Audio file input
  - [x] API key input
  - [x] Transcription overview cards
  - [x] Recent transcriptions list
- [x] Create TranscriptionDetail view
  - [x] Audio player with scrubbing
  - [x] Interactive text display
  - [x] Word-level timing display
  - [x] JSON/Text toggle
  - [x] Export functionality

## Phase 5: Advanced Features

- [ ] Implement text-to-audio syncing
  - [ ] Click word to jump to audio position
  - [ ] Auto-scroll text during playback
  - [ ] Highlight current word/sentence
- [ ] Add toggle for sync behavior
- [ ] Implement search within transcriptions
- [ ] Add metadata display (file size, date, duration, etc.)

## Phase 6: API Integration

- [ ] Implement ElevenLabs STT API calls
- [ ] Handle API responses and errors
- [ ] Implement request progress tracking
- [ ] Add retry mechanism for failed requests

## Phase 7: UI/UX Polish

- [ ] Responsive design for mobile/desktop
- [ ] Dark/light theme support
- [ ] Keyboard shortcuts
- [ ] Drag & drop file upload
- [ ] Toast notifications for user feedback

## Phase 8: Data Persistence & Management

- [ ] Export transcriptions (JSON, TXT, SRT)
- [ ] Import existing transcriptions
- [ ] Delete transcriptions with confirmation
- [ ] Bulk operations

## Phase 9: Performance & Optimization

- [ ] Lazy loading for large transcription lists
- [ ] Audio file compression/optimization
- [ ] Debounced search
- [ ] Virtual scrolling for long texts

## Phase 10: Testing & Documentation

- [ ] Add error boundaries
- [ ] Input validation
- [ ] API error handling
- [ ] User guide/help section

## Technical Specifications

- **Framework**: Vue 3 with Composition API
- **UI Library**: shadcn-vue
- **Icons**: Lucide Vue
- **HTTP Client**: Axios
- **Storage**: IndexedDB for transcriptions, localStorage for settings
- **Audio Caching**: Blob storage with URL.createObjectURL
- **Routing**: Vue Router

## API Response Structure

```json
{
  "language_code": "en",
  "language_probability": 1,
  "text": "transcribed text",
  "words": [
    {
      "text": "word",
      "start": 0.119,
      "end": 0.259,
      "type": "word|spacing",
      "speaker_id": "speaker_0"
    }
  ]
}
```

## Storage Schema

- **Transcriptions**: id, filename, fileSize, createdAt, duration, apiResponse, audioBlob
- **Settings**: apiKey, syncEnabled, theme, etc.
