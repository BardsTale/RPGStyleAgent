<template>
  <div class="!mt-10" style="display: flex; flex-direction: row">
    <div class="style__agent">
      <div class="w-30 h-30">
        <img
          src="https://avatar.baram.nexon.com/Coordi/RenderAvatar/M?pi=고요한베이직수트|클래식외줄안경|헤어%3A가일컷|얼굴봉인구슬%3A평범눈썹&mt=1"
          alt="스타일 에이전트"
          class="style__agent--avatar"
        />
      </div>
    </div>
    <div class="style__display z-10">
      <div class="flex flex-col gap-2 !mb-3">
        <input
          type="text"
          placeholder="원하는 스타일을 입력하세요!"
          v-model="styleText"
          class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div class="relative !mb-3">
        <button
          v-if="!isSearching"
          @click="() => searchValidation() && searchThrottle(searchBaramChar, 500)"
          class="w-70 flex items-center gap-2 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition"
        >
          🔍 <span>스타일 에이전트에게 요청!</span>
        </button>
        <button
          v-else
          class="w-70 bg-green-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <span
            class="loader w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
          ></span>
          로딩 중...
        </button>
      </div>
    </div>
  </div>
  <div class="style__agent--textbox">
    {{
      responseText?.outfit?.reason ? responseText?.outfit?.reason : '원하는 스타일을 요청하세요!'
    }}
  </div>
</template>

<script setup>
import { ref } from 'vue'

/* emit 선언 */
const emits = defineEmits(['setOutfit'])

/* 캐릭터 검색 */
// 기본 변수 선언
const styleText = ref('')
const responseText = ref('')
const isSearching = ref(false)

// 검색 함수
const searchBaramChar = async () => {
  // 파라미터 설정
  const params = {
    text: styleText.value,
  }

  // url 설정
  const API_URL = import.meta.env.VITE_API_URL

  // fetch 통신
  const response = await fetch(`${API_URL}/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(`에러가 발생하였습니다! ${response.status}`)
  }
  const data = await response.json()
  isSearching.value = false
  responseText.value = data
  emits('setOutfit', data)
}

// 검색 쓰로틀링 함수(HoF)
const searchThrottle = (fn, delay) => {
  let timeoutId = null
  // 검색중으로 전환
  isSearching.value = true

  return (function (...args) {
    if (timeoutId) return // 이미 대기 중이면 실행하지 않음
    timeoutId = setTimeout(() => {
      fn(...args) // 실제 함수 호출
      timeoutId = null // 타임아웃 종료 후 timeoutId 초기화
    }, delay)
  })()
}

// 검색 벨리데이션 함수
const searchValidation = () => {
  if (!styleText.value) {
    alert('원하는 스타일을 입력하세요.')
    return false
  }
  return true
}
</script>

<style>
@import 'tailwindcss';
.style__agent--avatar {
  object-fit: contain;
  transform: scale(3);
  position: relative;
  top: -40%;
  z-index: 0;
}

.style__agent--textbox {
  width: 400px;
  max-width: 400px;
  position: absolute;
  padding: 16px 20px;
  background: white;
  border-radius: 16px;
  border: 1px solid #dcdfe6;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.04);
}

/* 위쪽 꼬리 */
.style__agent--textbox::before {
  content: '';
  position: absolute;

  top: -4px;
  left: 57px;
  transform: translateX(-50%);

  width: 20px;
  height: 20px;

  background: white;

  border-left: 1px solid #dcdfe6;
  border-top: 1px solid #dcdfe6;

  rotate: 45deg;
}
</style>
