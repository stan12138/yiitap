import { EditorState, TextSelection, Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view'
import { gridResizingPluginKey } from './state'
import {
  findBoundaryPosition,
  getColumnInfoAtPos,
  updateColumnNodeFlex,
} from '../utils/utils'

function updateActiveHandle(view: EditorView, value: number) {
  view.dispatch(
    view.state.tr.setMeta(gridResizingPluginKey, {
      setHandle: value,
    })
  )
}

export function handleMouseMove(
  view: EditorView,
  event: MouseEvent,
  handleWidth: number
) {
  const pluginState = gridResizingPluginKey.getState(view.state)

  // 正在拖拽时，严禁修改任何 Handle 状态
  if (!pluginState || pluginState.dragging) return false

  const boundaryPos = findBoundaryPosition(view, event, handleWidth)

  if (boundaryPos !== pluginState.activeHandle) {
    // 只有在没拖拽时才更新高亮手柄
    updateActiveHandle(view, boundaryPos)
  }
  return false
}

export function handleMouseLeave(view: EditorView) {
  const pluginState = gridResizingPluginKey.getState(view.state)
  if (!pluginState) return false
  if (pluginState.activeHandle > -1 && !pluginState.dragging) {
    updateActiveHandle(view, -1)
  }
  return false
}

/**
 * Handles the mousedown event to initialize the resizing process.
 * @param {EditorView} view - The ProseMirror editor view.
 * @param {MouseEvent} event - The native mouse event.
 * @param {number} minFlex - The minimum flex-grow value allowed for a column.
 */
export function handleMouseDown(
  view: EditorView,
  event: MouseEvent,
  minFlex: number = 0.1
): boolean {
  const pluginState = gridResizingPluginKey.getState(view.state)

  // 1. Validation of the current state
  if (!pluginState || pluginState.activeHandle === -1 || pluginState.dragging) {
    return false
  }

  const columnInfo = getColumnInfoAtPos(view, pluginState.activeHandle)
  if (!columnInfo) return false

  const { $pos, node, columnEl } = columnInfo
  const nodePos = $pos.before()
  const containerEl = columnEl.parentElement as HTMLElement

  if (!containerEl) return false

  // 2. Identify the next sibling column for paired resizing
  const nextColPos = nodePos + node.nodeSize
  const nextNode = view.state.doc.nodeAt(nextColPos)
  const hasNext = nextNode && nextNode.type.name === 'column'

  // 3. Calculate the total flex-grow sum of all siblings in the container
  let totalFlex = 0
  $pos.parent.forEach((child) => {
    totalFlex += child.attrs.flexGrow || 1
  })

  const containerWidth = containerEl.offsetWidth

  // 4. Update plugin state to start tracking
  view.dispatch(
    view.state.tr.setMeta(gridResizingPluginKey, {
      setDragging: {
        startX: event.clientX,
        startFlex: node.attrs.flexGrow || 1,
        nextColFlex: hasNext ? nextNode.attrs.flexGrow || 1 : null,
        nextColPos: hasNext ? nextColPos : null,
        totalFlex: totalFlex,
        containerWidth: containerWidth,
      },
    })
  )

  const win = view.dom.ownerDocument.defaultView || window

  /**
   * Internal move handler for mousemove events.
   * This function calculates the new flex-grow values and updates the document.
   * @param {MouseEvent} e - The native mousemove event.
   */
  const move = (e: MouseEvent): void => {
    // 1. Check if the mouse button is still pressed
    if (!e.buttons) {
      finish()
      return
    }

    // 2. Retrieve the current dragging state from the plugin state
    const currentState = gridResizingPluginKey.getState(view.state)
    const dragging = currentState?.dragging
    if (!dragging) return

    const {
      startX,
      startFlex,
      nextColFlex,
      nextColPos,
      totalFlex,
      containerWidth,
    } = dragging

    // 3. Calculate horizontal movement delta in pixels
    const deltaX = e.clientX - startX

    /**
     * 4. Convert pixel delta to flex-grow delta.
     * We multiply by totalFlex to normalize sensitivity.
     * (deltaX / containerWidth) represents the percentage of the container moved.
     */
    const deltaFlex = (deltaX / containerWidth) * totalFlex

    const tr = view.state.tr

    // 5. Calculate the new flex-grow for the left column (current column)
    // minFlex ensures the column doesn't disappear visually
    let newLeftFlex = Math.max(minFlex, startFlex + deltaFlex)

    /**
     * 6. Paired Resizing Logic:
     * If there's a neighboring column on the right, we redistribute weight
     * between them so the rest of the columns remain static.
     */
    if (nextColPos !== null && nextColFlex !== null) {
      // The sum of the two columns' flex-grow must remain constant
      const pairTotalFlex = startFlex + nextColFlex

      // Calculate right column flex while respecting minFlex
      let newRightFlex = Math.max(minFlex, pairTotalFlex - newLeftFlex)

      // Reverse-adjust the left column in case the right column hit its minFlex limit
      newLeftFlex = pairTotalFlex - newRightFlex

      // Update the left column node attributes
      tr.setNodeMarkup(nodePos, undefined, {
        ...node.attrs,
        flexGrow: newLeftFlex,
      })

      // Update the right column node attributes
      const rightNode = view.state.doc.nodeAt(nextColPos)
      if (rightNode && rightNode.type.name === 'column') {
        tr.setNodeMarkup(nextColPos, undefined, {
          ...rightNode.attrs,
          flexGrow: newRightFlex,
        })
      }
    } else {
      /**
       * 7. Single Column Resizing:
       * Used if it's the last column in the container.
       */
      tr.setNodeMarkup(nodePos, undefined, {
        ...node.attrs,
        flexGrow: newLeftFlex,
      })
    }

    /**
     * 8. Performance optimization:
     * We use addToHistory(false) to prevent every pixel of movement
     * from being recorded as a separate undo/redo step.
     */
    view.dispatch(tr.setMeta('addToHistory', false))
  }

  /**
   * Cleans up listeners and resets dragging state.
   */
  const finish = (): void => {
    win.removeEventListener('mouseup', finish)
    win.removeEventListener('mousemove', move)
    view.dispatch(
      view.state.tr.setMeta(gridResizingPluginKey, { setDragging: null })
    )
  }

  win.addEventListener('mouseup', finish)
  win.addEventListener('mousemove', move)

  event.preventDefault()
  return true
}

export function handleGridDecorations(
  state: EditorState,
  boundaryPos: number
): DecorationSet {
  const $pos = state.doc.resolve(boundaryPos)

  if ($pos.nodeAfter === null) return DecorationSet.empty

  // Create a reusable widget
  const widget = Decoration.widget(
    boundaryPos,
    () => {
      // This function only runs when ProseMirror actually needs to create the DOM
      const widgetDom = document.createElement('div')
      widgetDom.className = 'grid-resize-handle'

      const circleButton = document.createElement('div')
      circleButton.className = 'circle-button'

      const plusIcon = document.createElement('div')
      plusIcon.className = 'plus'

      circleButton.appendChild(plusIcon)
      const minuscircleButton = document.createElement('div')
      minuscircleButton.className = 'minus-circle-button'

      const minusIcon = document.createElement('div')
      minusIcon.className = 'minus'

      minuscircleButton.appendChild(minusIcon)

      widgetDom.appendChild(circleButton)

      widgetDom.appendChild(minuscircleButton)

      return widgetDom
    },
    {
      // Crucial: Use a key to help ProseMirror identify and reuse the decoration
      key: `grid-handle-${boundaryPos}`,
      // Ensure the handle stays at the same visual side
      side: 0,
    }
  )

  return DecorationSet.create(state.doc, [widget])
}

export function handleMouseUp(view: EditorView, event: MouseEvent): boolean {
  const target = event.target as HTMLElement;
  if (!target) return false;

  // 判断是否为添加列按钮（支持点击内部图标）
  const isAddButton =
    target.classList.contains('circle-button') ||
    target.classList.contains('plus') ||
    target.closest('.circle-button') !== null;

  // 判断是否为删除列按钮
  const isRemoveButton =
    target.classList.contains('minus-circle-button') ||
    target.classList.contains('minus') ||
    target.closest('.minus-circle-button') !== null;

  if (!isAddButton && !isRemoveButton) return false;

  // 获取当前列元素
  const column = target.closest('[data-type="column"]');
  if (!column) return false;

  const pos = view.posAtDOM(column, 0);
  if (pos === undefined) return false;

  const { state } = view;
  const $pos = state.doc.resolve(pos);
  const { column: columnType, paragraph: paragraphType } = state.schema.nodes;

  // 校验当前节点确实是列节点（避免误判）
  const currentNode = $pos.node($pos.depth);
  if (currentNode.type !== columnType) return false;

  // 添加列（原逻辑保持不变）
  if (isAddButton) {
    // 在当前列之后插入新列
    const insertPos = $pos.after($pos.depth);
    const newColumn = columnType.create({ flexGrow: 1 }, paragraphType.create());
    const tr = state.tr.insert(insertPos, newColumn);

    // 光标定位到新列内部的段落
    const newPos = insertPos + 2; // 新列起始 + 列内段落起始 + 段落内部偏移
    const selection = TextSelection.near(tr.doc.resolve(newPos));

    view.dispatch(tr.setSelection(selection).scrollIntoView());
    view.focus();
    return true;
  }

  // 删除列
  if (isRemoveButton) {
    // 获取父节点（columns 容器）
    const parentNode = $pos.node($pos.depth - 1);
    // 防止删除最后一列
    if (parentNode && parentNode.childCount === 1) {
      return false; // 至少保留一列
    }

    // 精确获取当前列的起始和结束位置
    const start = $pos.before($pos.depth);
    const end = $pos.after($pos.depth);

    const tr = state.tr.delete(start, end);

    // 设置光标：删除后，将光标定位到删除位置的前一个位置
    let newCursorPos = start - 1;
    // 如果前一个位置无效（比如删除了第一列），则定位到删除位置
    if (newCursorPos < 0) newCursorPos = start;
    const resolvedPos = tr.doc.resolve(newCursorPos);
    const selection = TextSelection.near(resolvedPos);

    view.dispatch(tr.setSelection(selection).scrollIntoView());
    view.focus();
    return true;
  }

  return false;
}