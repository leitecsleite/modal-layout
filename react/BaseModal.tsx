import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { CssHandlesTypes } from 'vtex.css-handles'
import classnames from 'classnames'

import TrapFocus from './components/TrapFocus'
import ModalManager from './modules/ModalManager'
import type { BackdropMode } from './components/Backdrop'
import Backdrop, {
  CSS_HANDLES as BackdropCssHandles,
} from './components/Backdrop'
import createChainedFunction from './modules/createChainedFunction'
import type { ContainerType } from './components/Portal'
import Portal, { getContainer } from './components/Portal'
import ownerDocument from './modules/ownerDocument'
import useEventCallback from './modules/useEventCallback'

export const CSS_HANDLES = ['modal', ...BackdropCssHandles] as const

interface Props
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > {
  open: boolean
  onClose: () => void
  backdrop?: BackdropMode
  container?: ContainerType
  disableEscapeKeyDown?: boolean
  children: React.ReactElement
  onBackdropClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  handles: CssHandlesTypes.CssHandles<typeof CSS_HANDLES>
}

const inlineStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    right: 0,
    bottom: 0,
    top: 0,
    left: 0,
    zIndex: 1300,
  },
} as const

const manager = new ModalManager()

export default function BaseModal(props: Props) {
  const {
    open,
    onClose,
    backdrop,
    children,
    container,
    onBackdropClick,
    disableEscapeKeyDown = false,
    handles,
    ...rest
  } = props

  const [exited, setExited] = useState(true)
  const modalRef = useRef<HTMLDivElement>(null)
  const isTopModal = useCallback(() => manager.isTopModal(modalRef), [])
  const getDoc = () => ownerDocument(modalRef.current)

  const handleExited = useCallback(() => {
    setExited(true)
  }, [setExited])

  const handleEnter = useCallback(() => {
    setExited(false)
  }, [setExited])

  const handleMounted = () => {
    manager.mount(modalRef)
  }

  const handleOpen = useEventCallback(() => {
    const resolvedContainer = getContainer(container) ?? getDoc().body

    manager.add(modalRef, resolvedContainer as HTMLElement, onClose)

    if (modalRef.current) {
      handleMounted()
    }
  })

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()

    if (rest.onClick) {
      rest.onClick(e)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disableEscapeKeyDown && e.key === 'Escape') {
      if (!isTopModal()) {
        return
      }

      e.stopPropagation()
      onClose()

      if (rest.onKeyDown) {
        rest.onKeyDown(e)
      }
    }
  }

  const handleClose = useCallback(() => {
    manager.remove(modalRef)
  }, [])

  useEffect(() => {
    if (open) {
      handleOpen()
    } else if (exited) {
      handleClose()
    }
  }, [exited, handleClose, handleOpen, open])

  // This is needed to prevent the modal from keeping this class if you
  // change the route and don't close the modal
  useEffect(() => {
    return () => {
      handleClose()
    }
  }, [handleClose])

  if (!open && exited) {
    return null
  }

  const childProps: Record<string, any> = {}

  if (children.props.tabIndex === undefined) {
    childProps.tabIndex = '-1'
  }

  childProps.onEnter = createChainedFunction(
    handleEnter,
    children.props.onEnter
  )
  childProps.onExited = createChainedFunction(
    handleExited,
    children.props.onExited
  )

  return (
    <Portal container={container}>
      <div
        {...rest}
        className={classnames(handles.modal, props.className)}
        ref={modalRef}
        role="presentation"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={inlineStyles.container}
        data-testid="base-modal"
      >
        <TrapFocus open={open}>
          {React.cloneElement(children, childProps)}
        </TrapFocus>
        {backdrop !== 'none' && (
          <Backdrop
            open={open}
            onClick={onBackdropClick}
            handles={props.handles}
          />
        )}
      </div>
    </Portal>
  )
}
