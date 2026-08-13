<template>
  <div class="agent-column">
    <div class="agent-console">
      <div class="agent-portrait">
        <img :src="agentAvatarUrl" alt="스타일 에이전트" class="agent-avatar" />
      </div>

      <form
        class="style-form"
        @submit.prevent="searchValidation() && searchThrottle(searchBaramChar, 500)"
      >
        <label class="input-label" for="stylePrompt">스타일 주문서</label>
        <div class="input-row">
          <textarea
            id="stylePrompt"
            placeholder="예: 달빛 아래 검객, 귀여운 도사, 왕실 호위무사"
            v-model="styleText"
            class="game-input"
            rows="3"
          ></textarea>
          <button v-if="!isSearching" class="game-button" type="submit">요청</button>
          <button v-else class="game-button is-loading" type="button">분석 중</button>
        </div>
      </form>
    </div>

    <div class="agent-message">
      <span class="message-label">에이전트 기록</span>
      <p>
        {{
          responseText?.outfit?.reason
            ? responseText?.outfit?.reason
            : '원하는 분위기를 적어주세요. 장비 조합과 추천 이유를 이곳에 정리해드립니다.'
        }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const emits = defineEmits(['setOutfit'])

const styleText = ref('')
const responseText = ref('')
const isSearching = ref(false)

const agentItems = ['고요한베이직수트', '클래식외줄안경', '헤어:가일컷', '얼굴봉인구슬:평범눈썹']
const agentAvatarUrl = computed(() => {
  const items = agentItems.map((item) => encodeURIComponent(item)).join('|')
  return `https://avatar.baram.nexon.com/Coordi/RenderAvatar/M?pi=${items}&mt=1`
})

const searchBaramChar = async () => {
  const params = {
    text: styleText.value,
  }

  const API_URL = import.meta.env.VITE_API_URL

  try {
    const response = await fetch(`${API_URL}/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      throw new Error(`추천 요청에 실패했습니다. 상태 코드: ${response.status}`)
    }

    const data = await response.json()
    responseText.value = data
    emits('setOutfit', data)
  } catch (error) {
    console.error('스타일 추천 오류:', error)
    alert('스타일 추천 중 오류가 발생했습니다.')
  } finally {
    isSearching.value = false
  }
}

const searchThrottle = (fn, delay) => {
  let timeoutId = null
  isSearching.value = true

  return (function (...args) {
    if (timeoutId) return
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  })()
}

const searchValidation = () => {
  if (!styleText.value.trim()) {
    alert('원하는 스타일을 입력하세요.')
    return false
  }
  return true
}
</script>
