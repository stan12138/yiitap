import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { Video } from '@stan-custom-yiitap/extension-video'
import View from './view.vue'

export const OVideo = Video.extend({
  addNodeView() {
    return VueNodeViewRenderer(View)
  },
})

export default OVideo
