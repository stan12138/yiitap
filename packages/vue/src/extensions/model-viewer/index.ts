import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ModelViewer from '@stan-custom-yiitap/extension-model-viewer'
import View from './view.vue'

export const OModelViewer = ModelViewer.extend({
  addNodeView() {
    return VueNodeViewRenderer(View)
  },
})

export default OModelViewer
