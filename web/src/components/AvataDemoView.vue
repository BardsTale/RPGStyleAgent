<template>
  <div class="w-[400px] h-64 overflow-hidden rounded-lg shadow-lg !mt-10">
    <img :src="avataUrl" alt="Example Image" class="w-full h-full object-contain" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type OutfitPlan = {
  hair?: string | null
  top?: string | null
  bottom?: string | null
  outer?: string | null
  shoes?: string | null
  accessory?: string | null
  weapon?: string | null
  reason?: string
}
const EXCLUDE_KEYS: (keyof OutfitPlan)[] = ['reason']

/*
아래와 같이 요청하면 됨.
- 파라미터 정리
M=남성, F=여성
pi=아이템명|아이템명
mt=포즈(동작)
avatar.baram.nexon.com/Coordi/RenderAvatar/M?pi=꽃들의전쟁광브로치|꽃들의전쟁비광한복|꽃들의전쟁목단&mt=1
*/

const props = withDefaults(
  defineProps<{
    serverName: string
    charName: string
    gender: string
    outfitInfo?: OutfitPlan
  }>(),
  {
    gender: 'M',
  },
)

const DEAFULT_URL = 'https://avatar.baram.nexon.com'

const profileUrl = computed(
  () =>
    `${DEAFULT_URL}/Profile/RenderAvatar/${props.serverName}/${props.charName}?is=1&changeDir=2&ed=n&sc=-1`,
)
const coordiUrl = computed(
  () => `${DEAFULT_URL}/Coordi/RenderAvatar/${props.gender}?is=1&changeDir=2&ed=n&sc=-1&mt=1`,
)
const avataUrl = computed(() => {
  let resultUrl = ''

  // 프로파일 유무에 따라 base url 설정
  if (props.serverName && props.charName) {
    resultUrl = profileUrl.value
  } else {
    resultUrl = coordiUrl.value
  }

  // 추천 아웃핏 정보가 있을 경우 pi 쿼리 값 생성 후 부착
  if (props.outfitInfo) {
    const llmParts = Object.entries(props.outfitInfo).reduce((acc, [slotKey, value]) => {
      if (!EXCLUDE_KEYS.includes(slotKey as keyof OutfitPlan)) acc.push(value)
      return acc
    }, [])

    resultUrl += `&pi=${llmParts.join('|')}`
  }

  return resultUrl
})
</script>

<style></style>
