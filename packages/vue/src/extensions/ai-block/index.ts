import { VueNodeViewRenderer } from '@tiptap/vue-3'
import AiBlock from '@stan-custom-yiitap/extension-ai-block'
import type { AiBlockOptions } from '@stan-custom-yiitap/extension-ai-block'
import View from './view.vue'

const OAiBlock = AiBlock.extend<AiBlockOptions>({
  addNodeView() {
    return VueNodeViewRenderer(View)
  },
})

export default OAiBlock
