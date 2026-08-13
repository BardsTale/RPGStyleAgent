<template>
  <div class="item-grid">
    <article v-for="item in visibleItems" :key="`${item.ItemName}-${item.SlotName}`" class="item-card">
      <div class="item-icon">
        <img :src="`https://avatar.baram.nexon.com/Item/Render/${item.ItemName}`" alt="" />
      </div>
      <strong>{{ item.ItemName }}</strong>
      <span>{{ item.SlotName }}</span>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import itemDB from '../itemData.json'

const itemData = ref(itemDB.itemData)
const visibleCount = ref(16)

const visibleItems = computed(() => itemData.value.slice(0, visibleCount.value))
</script>
