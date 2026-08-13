<template>
  <div class="styling-board">
    <div class="board-header">
      <div>
        <p class="eyebrow">KINGDOM STYLE LAB</p>
        <h2>캐릭터 코디 미리보기</h2>
      </div>
      <span class="status-chip">ON AIR</span>
    </div>

    <AvataDemoView
      :server-name="serverName"
      :char-name="charName"
      :outfit-info="outfitInfo?.outfit"
    />

    <div class="character-search" v-if="false">
      <select v-model="serverName" class="game-input">
        <option value="" disabled selected>서버를 선택하세요</option>
        <option value="연">연</option>
        <option value="무휼">무휼</option>
        <option value="유리">유리</option>
        <option value="하자">하자</option>
        <option value="호동">호동</option>
      </select>
      <input
        type="text"
        placeholder="캐릭터명을 입력하세요"
        v-model="charName"
        class="game-input"
      />
      <button
        v-if="!isSearching"
        @click="() => searchValidation() && searchThrottle(searchBaramChar, 500)"
        class="game-button"
      >
        캐릭터 불러오기
      </button>
      <button v-else class="game-button is-loading">불러오는 중...</button>
    </div>

    <AvataLLM @set-outfit="setOutfit" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AvataDemoView from './AvataDemoView.vue'
import AvataLLM from './AvataLlm.vue'

const emits = defineEmits(['defineAvatar'])

const serverName = ref('')
const charName = ref('')
const outfitInfo = ref()
const isSearching = ref(false)

const setOutfit = (outfit) => {
  outfitInfo.value = outfit
}

const searchBaramChar = () => {
  const params = {
    character_name: charName.value,
    server_name: serverName.value,
  }

  const headers = {
    Accept: 'application/json',
    'x-nxopen-api-key': import.meta.env.VITE_API_KEY,
  }

  const url = new URL('https://open.api.nexon.com/baram/v1/id')
  url.search = new URLSearchParams(params).toString()

  fetch(url, {
    method: 'GET',
    headers,
  })
    .then((response) => {
      if (!response.ok) {
        alert('존재하지 않는 캐릭터입니다.')
        throw new Error('캐릭터 조회에 실패했습니다.')
      }
      return response.json()
    })
    .then((data) => {
      if (data.ocid) emits('defineAvatar', serverName.value, charName.value)
    })
    .catch((error) => console.error('캐릭터 조회 오류:', error))
    .finally(() => {
      isSearching.value = false
    })
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
  if (!serverName.value) {
    alert('서버명을 입력하세요.')
    return false
  }
  if (!charName.value) {
    alert('캐릭터명을 입력하세요.')
    return false
  }
  return true
}
</script>
