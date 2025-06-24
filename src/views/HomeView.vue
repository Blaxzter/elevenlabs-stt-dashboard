<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl"> <!-- Header -->
    <div class="mb-8 flex items-start justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">ElevenLabs STT Dashboard</h1>
        <p class="text-muted-foreground mt-2">
          Upload audio files and transcribe them using ElevenLabs Speech-to-Text API
        </p>
      </div>
      <ThemeToggle variant="select" />
    </div>

    <!-- Main Upload Section -->
    <div class="grid lg:grid-cols-3 gap-8 mb-8">
      <!-- Upload Panel -->
      <div class="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center space-x-2">
              <Upload class="h-5 w-5" />
              <span>Upload Audio File</span>
            </CardTitle>
            <CardDescription>
              Select an audio file to transcribe using ElevenLabs API
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <AudioFileInput v-model="selectedFile" v-model:transcription-options="transcriptionOptions"
              v-model:selected-region="selectedRegion" @file-selected="handleFileSelected" @error="handleFileError" />

            <!-- Region Info -->
            <div v-if="selectedRegion" class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div class="flex items-center space-x-2 text-blue-700">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span class="font-medium">Audio region selected:</span>
                <span>{{ formatDuration(selectedRegion.start) }} - {{ formatDuration(selectedRegion.end) }}</span>
                <span class="text-blue-600">({{ formatDuration(selectedRegion.end - selectedRegion.start) }}
                  duration)</span>
              </div>
              <p class="text-blue-600 mt-1">Only the selected region will be transcribed.</p>
            </div>

            <Button @click="startTranscription" :disabled="!canStartTranscription" class="w-full" size="lg">
              <Loader2 v-if="isProcessing" class="h-4 w-4 mr-2 animate-spin" />
              <Mic v-else class="h-4 w-4 mr-2" />
              {{
                isProcessing
                  ? 'Processing...'
                  : selectedRegion
                    ? `Transcribe Selected Region (${formatDuration(selectedRegion.end - selectedRegion.start)})`
                    : 'Start Transcription'
              }}
            </Button>
          </CardContent>
        </Card>

        <!-- Current Transcription Preview -->
        <TranscriptionOutput v-if="currentTranscription" :transcription="currentTranscription"
          :current-time="currentAudioTime" v-model:word-sync-enabled="wordSyncEnabled"
          @word-clicked="handleWordClick" />
      </div>

      <!-- Settings Panel -->
      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center space-x-2">
              <Key class="h-5 w-5" />
              <span>API Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ApiKeyInput v-model="apiKey" @validated="handleApiKeyValidated" @error="handleApiKeyError" />
          </CardContent>
        </Card>

        <!-- Quick Stats -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center space-x-2">
              <BarChart3 class="h-5 w-5" />
              <span>Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Total Transcriptions</span>
              <span class="font-medium">{{ transcriptions.length }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Completed</span>
              <span class="font-medium text-green-600">{{ completedTranscriptions.length }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Processing</span>
              <span class="font-medium text-blue-600">{{ processingTranscriptions.length }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Errors</span>
              <span class="font-medium text-red-600">{{ errorTranscriptions.length }}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Transcriptions List -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold tracking-tight">Recent Transcriptions</h2>
        <div class="flex items-center space-x-2">
          <Button variant="outline" size="sm" @click="refreshTranscriptions">
            <RefreshCw class="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <Loader2 class="h-8 w-8 animate-spin text-primary" />
      </div>

      <!-- Empty State -->
      <div v-else-if="transcriptions.length === 0" class="text-center py-12">
        <FileText class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium mb-2">No transcriptions yet</h3>
        <p class="text-muted-foreground mb-4">Upload your first audio file to get started</p>
      </div>

      <!-- Transcriptions Grid -->
      <div v-else class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <TranscriptionCard v-for="transcription in transcriptions" :key="transcription.id"
          :transcription="transcription" @click="viewTranscription(transcription)"
          @delete="deleteTranscription(transcription.id)" />
      </div>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive" class="mt-6">
      <AlertCircle class="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Upload,
  Mic,
  Key,
  BarChart3,
  RefreshCw,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-vue-next'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

import AudioFileInput from '@/components/AudioFileInput.vue'
import ApiKeyInput from '@/components/ApiKeyInput.vue'
import TranscriptionOutput from '@/components/TranscriptionOutput.vue'
import TranscriptionCard from '@/components/TranscriptionCard.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

import { useTranscriptions } from '@/composables/useTranscriptions'
import type { TranscriptionData } from '@/lib/database'

const router = useRouter()

// Composables
const {
  transcriptions,
  loading,
  error: transcriptionError,
  completedTranscriptions,
  processingTranscriptions,
  errorTranscriptions,
  loadTranscriptions,
  createTranscription,
  deleteTranscription: deleteTranscriptionFromStore,
} = useTranscriptions()

// Local state
const selectedFile = ref<File | null>(null)
const apiKey = ref('')
const selectedRegion = ref<{ start: number; end: number } | null>(null)
const transcriptionOptions = ref({
  modelId: 'scribe_v1',
  tagAudioEvents: true,
  languageCode: null,
  diarize: true,
})
const currentTranscription = ref<TranscriptionData | null>(null)
const currentAudioTime = ref(0)
const wordSyncEnabled = ref(false)
const isProcessing = ref(false)
const error = ref<string | null>(null)
const apiKeyValid = ref(false)

// Computed
const canStartTranscription = computed(
  () => selectedFile.value && apiKey.value && apiKeyValid.value && !isProcessing.value,
)

// Methods
function handleFileSelected(file: File) {
  selectedFile.value = file
  error.value = null
}

function handleFileError(errorMessage: string) {
  error.value = errorMessage
}

function handleApiKeyValidated(isValid: boolean) {
  apiKeyValid.value = isValid
}

function handleApiKeyError(errorMessage: string) {
  error.value = errorMessage
}

async function startTranscription() {
  if (!selectedFile.value || !apiKey.value) return

  try {
    isProcessing.value = true
    error.value = null

    let fileToTranscribe = selectedFile.value

    // If a region is selected, cut the audio first
    if (selectedRegion.value) {
      try {
        const { audioProcessor } = await import('@/lib/audio-processor')

        // Validate the region
        const isValidRegion = await audioProcessor.validateRegion(selectedFile.value, selectedRegion.value)
        if (!isValidRegion) {
          throw new Error('Invalid audio region selected')
        }

        // Cut the audio to the selected region
        fileToTranscribe = await audioProcessor.cutAudioRegion(selectedFile.value, selectedRegion.value)

        console.log(`Audio cut to region ${selectedRegion.value.start}s - ${selectedRegion.value.end}s`)
      } catch (audioError) {
        console.error('Audio cutting failed:', audioError)
        error.value = audioError instanceof Error ? audioError.message : 'Failed to process audio region'
        return
      }
    }

    const transcriptionId = await createTranscription(
      fileToTranscribe,
      apiKey.value,
      transcriptionOptions.value,
    )

    // Find the created transcription and set it as current
    const transcription = transcriptions.value.find((t) => t.id === transcriptionId)
    if (transcription) {
      currentTranscription.value = transcription
    }

    // Clear the selected file and region
    selectedFile.value = null
    selectedRegion.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start transcription'
  } finally {
    isProcessing.value = false
  }
}

function handleWordClick(time: number) {
  currentAudioTime.value = time
  // Here you would seek the audio player to this time
  // This will be implemented when we add the audio player component
}

function viewTranscription(transcription: TranscriptionData) {
  router.push({ name: 'transcription', params: { id: transcription.id } })
}

async function deleteTranscription(id: string) {
  if (confirm('Are you sure you want to delete this transcription?')) {
    try {
      await deleteTranscriptionFromStore(id)

      // Clear current transcription if it was deleted
      if (currentTranscription.value?.id === id) {
        currentTranscription.value = null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete transcription'
    }
  }
}

async function refreshTranscriptions() {
  await loadTranscriptions()
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Watch for transcription error and display it
watch([error, transcriptionError], ([err, transErr]) => {
  if (err || transErr) {
    error.value = err || transErr
  }
})

onMounted(() => {
  loadTranscriptions()
})
</script>
