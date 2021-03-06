import { useEffect, useState } from 'react';

export default function useHover(ref) {
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    function handleHover() {
      setIsHovering(!isHovering);
    }

    const refElement = ref.current;
    if (refElement) {
      refElement.addEventListener('mouseover', handleHover);
      refElement.addEventListener('mouseleave', handleHover);
      return () => {
        refElement.removeEventListener('mouseover', handleHover);
        refElement.removeEventListener('mouseleave', handleHover);
      };
    }
  }, [ref, isHovering]);

  return isHovering;
}
