<template>
  <o-popover
    ref="popover"
    class="o-simple-command-btn"
    content-class="dropdown"
    size="medium"
    :placement="placement"
    :trigger="trigger"
  >
    <template #trigger>
      <o-command-btn
        icon="format_size"
        content-class="o-align-dropdown dropdown"
        tooltip="font size"
      >
        <o-icon name="arrow_drop_down" class="arrow" />
      </o-command-btn>
    </template>

    <o-list hoverable clickable>
      <template v-for="(item, index) in options" :key="index">
        <o-list-item
          :class="{ 'is-active': editor?.getAttributes('textStyle')?.fontSize == item.value }"
          @click="onSelect(item.value)"
        >
          <span :style="{fontSize: item.value}">{{ item.label }}</span>
          <template #suffix>
            <o-icon
              name="done"
              small
              v-if="editor?.getAttributes('textStyle')?.fontSize == item.value"
            />
          </template>
        </o-list-item>
      </template>
    </o-list>
  </o-popover>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Editor } from '@tiptap/core'
import { OCommandBtn, OIcon, OList, OListItem, OPopover } from '../index'

import useI18n from '../../hooks/useI18n'
import useTiptap from '../../hooks/useTiptap'

const props = defineProps({
  editor: {
    type: Object,
  },
  placement: {
    type: String,
    default: 'bottom-start',
  },
  trigger: {
    type: String,
    default: 'click',
  },
})
const { tr } = useI18n()
const { run } = useTiptap()
const popover = ref(null)

const options = computed(() => {
  return [
    { label: "Smaller",value: '12px'},
    { label: "Small", value: '14px' },
    { label: "Medium", value: '' },
    { label: "Large",value: '18px' },
    { label: "Extra", value: '24px' },
  ]
})

function onSelect(value: string) {
  popover.value?.setShow(false)
  run(props.editor as Editor, 'fontSize', {
    fontSize: value,
  })
}
</script>

<style lang="scss">
.o-align-dropdown {
}
</style>
