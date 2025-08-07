import React from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
  container?: Element | DocumentFragment;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({ 
  children, 
  container 
}) => {
  const [mountNode, setMountNode] = React.useState<Element | null>(null);

  React.useEffect(() => {
    // Create a dedicated portal container for modals
    let portalContainer = container as Element;
    
    if (!portalContainer) {
      portalContainer = document.getElementById('modal-portal-root');
      
      if (!portalContainer) {
        portalContainer = document.createElement('div');
        portalContainer.id = 'modal-portal-root';
        (portalContainer as HTMLElement).style.position = 'fixed';
        (portalContainer as HTMLElement).style.top = '0';
        (portalContainer as HTMLElement).style.left = '0';
        (portalContainer as HTMLElement).style.width = '100%';
        (portalContainer as HTMLElement).style.height = '100%';
        (portalContainer as HTMLElement).style.pointerEvents = 'none';
        (portalContainer as HTMLElement).style.zIndex = '9999';
        document.body.appendChild(portalContainer);
      }
    }
    
    setMountNode(portalContainer);

    return () => {
      // Clean up portal container if we created it
      if (!container && portalContainer && portalContainer.id === 'modal-portal-root') {
        const existingContainer = document.getElementById('modal-portal-root');
        if (existingContainer && existingContainer.children.length === 0) {
          document.body.removeChild(existingContainer);
        }
      }
    };
  }, [container]);

  if (!mountNode) return null;

  return createPortal(children, mountNode);
};