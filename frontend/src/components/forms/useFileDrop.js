import { useRef, useState } from "react";

const useFileDrop = (onFile) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const resetDrag = () => {
    dragCounter.current = 0;
    setIsDragging(false);
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      resetDrag();
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    resetDrag();

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      onFile(file);
    }
  };

  return {
    isDragging,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
};

export default useFileDrop;
