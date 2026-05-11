<template>
  <div>
    <table class="table-auto w-full border-collapse border border-gray-300">
      <tbody>
        <tr v-for="(row, index) in chunkedArray" :key="index">
          <td v-for="(item, i) in row" :key="i" class="border border-gray-300 p-2 text-center">
            <img
              :src="`https://avatar.baram.nexon.com/Item/Render/${item.ItemName}`"
              class="inline-block"
              alt=""
            />
            <div>{{ item.ItemName }}</div>
            <div>[{{ item.SlotName }}]</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import itemDB from '../itemData.json'

/* 기본 변수 선언 */
const itemData = ref(itemDB.itemData)

/* 아이템 리스트 구성 */
const visibleRow = ref(4) // 현재 보이는 리스트 갯수.
// 4xN 배열 구성하는 컴퓨티드
const chunkedArray = computed(() => {
  const chunkSize = 4
  let result = []
  for (let i = 0; i < chunkSize * visibleRow.value; i += chunkSize) {
    result.push(itemData.value.slice(i, i + chunkSize))
  }
  return result
})
</script>

<style>
@import 'tailwindcss';
</style>
