import { VueNodeViewRenderer } from '@tiptap/vue-3'
import Image from '@stan-custom-yiitap/extension-image'
import type { ImageOptions } from '@stan-custom-yiitap/extension-image'

import View from './view.vue'

const OImage = Image.extend<ImageOptions>({
  addNodeView() {
    return VueNodeViewRenderer(View)
  },
}).configure({
  inline: true, // Set true to support alignment
})

export default OImage
