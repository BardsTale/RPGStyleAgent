<template>
  <main class="app-shell">
    <section class="hero-panel">
      <div class="brand-mark" aria-hidden="true"></div>
      <div class="hero-copy">
        <p class="eyebrow">스타일 에이전트 for 바람의나라</p>
        <h1>RPG Style Agent</h1>
        <p class="hero-description">
          원하는 스타일을 요청하면, 스타일 에이전트가 어울리는 아이템 조합과 추천 이유를
          정리해줍니다.
        </p>
        <div class="hero-badges" aria-label="서비스 특징">
          <span>AI 추천</span>
          <span>아바타 미리보기</span>
          <span>코디 도감</span>
        </div>
      </div>
    </section>

    <section class="workspace">
      <AvataDemo @defineAvatar="setAvatarInfo" />
    </section>

    <section class="catalog-section">
      <div class="section-heading">
        <p>ITEM CATALOG</p>
        <h2>오늘의 코디 재료</h2>
      </div>
      <AvataList />
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import AvataDemo from './components/AvataDemo.vue'
import AvataList from './components/AvataList.vue'

const serverName = ref('')
const charName = ref('')

const setAvatarInfo = (serverInfo, charInfo) => {
  serverName.value = serverInfo
  charName.value = charInfo
}
</script>
