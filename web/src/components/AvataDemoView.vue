<template>
  <div class="avatar-stage">
    <img :src="avataUrl" alt="바람의나라 캐릭터 미리보기" class="avatar-image" />
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
const DEFAULT_URL = 'https://avatar.baram.nexon.com'

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

const profileUrl = computed(
  () =>
    `${DEFAULT_URL}/Profile/RenderAvatar/${props.serverName}/${props.charName}?is=1&changeDir=2&ed=n&sc=-1`,
)

const coordiUrl = computed(
  () => `${DEFAULT_URL}/Coordi/RenderAvatar/${props.gender}?is=1&changeDir=2&ed=n&sc=-1&mt=1`,
)

const avataUrl = computed(() => {
  let resultUrl = props.serverName && props.charName ? profileUrl.value : coordiUrl.value

  if (props.outfitInfo) {
    const llmParts = Object.entries(props.outfitInfo).reduce<string[]>((acc, [slotKey, value]) => {
      if (!EXCLUDE_KEYS.includes(slotKey as keyof OutfitPlan) && value) acc.push(value)
      return acc
    }, [])

    resultUrl += `&pi=${llmParts.join('|')}`
  }

  return resultUrl
})
</script>
