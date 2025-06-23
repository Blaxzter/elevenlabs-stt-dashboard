<template>
  <div class="space-y-4">
    <div>
      <label
        for="api-key"
        class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        ElevenLabs API Key
      </label>
      <div class="flex space-x-2 mt-2">
        <div class="relative flex-1">
          <Input
            id="api-key"
            v-model="apiKey"
            :type="showKey ? 'text' : 'password'"
            placeholder="Enter your ElevenLabs API key"
            class="pr-10"
            @input="handleInput"
            @blur="handleBlur"
          />
          <Button
            variant="ghost"
            size="sm"
            type="button"
            class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            @click="toggleKeyVisibility"
          >
            <Eye v-if="!showKey" class="h-4 w-4" />
            <EyeOff v-else class="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" @click="clearKey" :disabled="!apiKey">
          <Trash2 class="h-4 w-4" />
        </Button>
      </div>
      <p class="text-xs text-muted-foreground mt-1">
        Your API key is stored locally and never sent to any server except ElevenLabs.
        <a
          href="https://elevenlabs.io/speech-synthesis"
          target="_blank"
          class="text-primary hover:underline"
        >
          Get your API key
        </a>
      </p>
    </div>

    <!-- Validation Status -->
    <div v-if="validationStatus" class="flex items-center space-x-2">
      <CheckCircle v-if="validationStatus === 'valid'" class="h-4 w-4 text-green-500" />
      <AlertCircle v-else-if="validationStatus === 'invalid'" class="h-4 w-4 text-destructive" />
      <Loader2 v-else class="h-4 w-4 animate-spin text-muted-foreground" />

      <span
        class="text-sm"
        :class="{
          'text-green-600': validationStatus === 'valid',
          'text-destructive': validationStatus === 'invalid',
          'text-muted-foreground': validationStatus === 'validating',
        }"
      >
        {{ validationMessage }}
      </span>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertTitle>Invalid API Key</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Eye, EyeOff, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { db } from '@/lib/database'
import { elevenLabsAPI } from '@/lib/elevenlabs-api'

interface ApiKeyInputProps {
  modelValue?: string
  validateOnChange?: boolean
}

interface ApiKeyInputEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'validated', isValid: boolean): void
  (e: 'error', error: string): void
}

const props = withDefaults(defineProps<ApiKeyInputProps>(), {
  modelValue: '',
  validateOnChange: true,
})

const emit = defineEmits<ApiKeyInputEmits>()

const apiKey = ref('')
const showKey = ref(false)
const validationStatus = ref<'valid' | 'invalid' | 'validating' | null>(null)
const validationMessage = ref('')
const error = ref<string | null>(null)
let validationTimeout: NodeJS.Timeout | null = null

// Load saved API key on mount
onMounted(async () => {
  try {
    await db.init()
    const savedKey = (await db.getSetting('apiKey')) as string
    const savedValidationStatus = (await db.getSetting('apiKeyValidationStatus')) as string
    const savedValidationMessage = (await db.getSetting('apiKeyValidationMessage')) as string

    if (savedKey) {
      apiKey.value = savedKey
      emit('update:modelValue', savedKey)

      // Restore validation status if it exists
      if (savedValidationStatus && savedValidationStatus === 'valid') {
        validationStatus.value = 'valid'
        validationMessage.value = savedValidationMessage || 'API key is valid'
        // Emit validation status immediately so parent component knows
        emit('validated', true)
      } else if (savedValidationStatus && savedValidationStatus === 'invalid') {
        validationStatus.value = 'invalid'
        validationMessage.value = savedValidationMessage || 'API key is invalid'
        emit('validated', false)
      }
    }
  } catch (err) {
    console.error('Failed to load API key:', err)
  }
})

function handleInput() {
  emit('update:modelValue', apiKey.value)
  error.value = null

  if (props.validateOnChange && apiKey.value.trim()) {
    // Debounce validation
    if (validationTimeout) {
      clearTimeout(validationTimeout)
    }

    validationTimeout = setTimeout(() => {
      validateApiKey()
    }, 500)
  } else {
    validationStatus.value = null
    validationMessage.value = ''
  }
}

async function handleBlur() {
  if (apiKey.value.trim()) {
    await saveApiKey()
    if (props.validateOnChange) {
      await validateApiKey()
    }
  }
}

async function validateApiKey() {
  if (!apiKey.value.trim()) {
    validationStatus.value = null
    validationMessage.value = ''
    await saveValidationStatus(null, '')
    return
  }

  validationStatus.value = 'validating'
  validationMessage.value = 'Validating API key...'

  try {
    const isValid = elevenLabsAPI.validateApiKey(apiKey.value.trim())

    if (isValid) {
      validationStatus.value = 'valid'
      validationMessage.value = 'API key is valid'
      await saveValidationStatus('valid', validationMessage.value)
      emit('validated', true)
    } else {
      validationStatus.value = 'invalid'
      validationMessage.value = 'API key format is invalid'
      await saveValidationStatus('invalid', validationMessage.value)
      emit('validated', false)
    }
  } catch (err) {
    validationStatus.value = 'invalid'
    validationMessage.value = 'Failed to validate API key'
    error.value = err instanceof Error ? err.message : 'Validation failed'
    await saveValidationStatus('invalid', validationMessage.value)
    emit('validated', false)
    emit('error', error.value)
  }
}

async function saveApiKey() {
  try {
    await db.saveSetting('apiKey', apiKey.value.trim())
  } catch (err) {
    console.error('Failed to save API key:', err)
  }
}

async function saveValidationStatus(status: string | null, message: string) {
  try {
    await db.saveSetting('apiKeyValidationStatus', status || '')
    await db.saveSetting('apiKeyValidationMessage', message)
  } catch (err) {
    console.error('Failed to save validation status:', err)
  }
}

function toggleKeyVisibility() {
  showKey.value = !showKey.value
}

async function clearKey() {
  apiKey.value = ''
  validationStatus.value = null
  validationMessage.value = ''
  error.value = null

  try {
    await db.saveSetting('apiKey', '')
    await saveValidationStatus(null, '')
  } catch (err) {
    console.error('Failed to clear API key:', err)
  }

  emit('update:modelValue', '')
}

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== apiKey.value) {
      apiKey.value = newValue || ''
    }
  },
)
</script>
