import React, { useRef, useState, useEffect } from 'react';

const ExcalidrawClone = () => {
  const canvasRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [selectedTool, setSelectedTool] = useState('rectangle');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState(null);
  const [socket, setSocket] = useState(null);
  const [roomId] = useState(() => crypto.randomUUID());
  const [remoteCursors, setRemoteCursors] = useState(new Map());
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [shareUrl, setShareUrl] = useState('');

  // Initialize WebSocket and encryption
  useEffect(() => {
    initializeEncryption();
    initializeWebSocket();
    
    return () => {
      if (socket) socket.close();
    };
  }, []);

  const initializeEncryption = async () => {
    // Generate or import encryption key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 128 },
      true,
      ['encrypt', 'decrypt']
    );
    setEncryptionKey(key);
    
    // Export key for sharing
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    const url = `${window.location.origin}#room=${roomId},${exportedKey.k}`;
    setShareUrl(url);
  };

  const initializeWebSocket = () => {
    const ws = new WebSocket(`ws://localhost:3000/ws?room=${roomId}`);
    
    ws.onopen = () => {
      console.log('Connected to room:', roomId);
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };
    
    ws.onerror = (error) => console.error('WebSocket error:', error);
    ws.onclose = () => console.log('WebSocket closed');
    
    setSocket(ws);
  };

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'SCENE_UPDATE':
        handleRemoteSceneUpdate(message.payload);
        break;
        
      case 'SCENE_UPDATE_DRAWING':
        // 🔴 Handle live drawing updates
        handleRemoteDrawingUpdate(message.payload);
        break;
        
      case 'MOUSE_LOCATION':
        handleRemoteMouseLocation(message.payload);
        break;
        
      case 'USER_JOINED':
        console.log('User joined:', message.payload.userName);
        break;
        
      case 'USER_LEFT':
        handleUserLeft(message.payload);
        break;
    }
  };

  const handleRemoteSceneUpdate = (payload) => {
    if (payload.userId === socket?.id) return; // Ignore own updates
    
    setElements(prevElements => {
      const elementMap = new Map(prevElements.map(el => [el.id, el]));
      
      payload.elements.forEach(remoteEl => {
        const localEl = elementMap.get(remoteEl.id);
        
        if (!localEl || remoteEl.version > localEl.version) {
          elementMap.set(remoteEl.id, remoteEl);
        } else if (remoteEl.version === localEl.version && 
                   remoteEl.versionNonce > localEl.versionNonce) {
          elementMap.set(remoteEl.id, remoteEl);
        }
      });
      
      return Array.from(elementMap.values());
    });
  };
  
  // 🔴 NEW: Handle live drawing updates (while user is still drawing)
  const handleRemoteDrawingUpdate = (payload) => {
    if (payload.userId === socket?.id) return;
    
    setElements(prevElements => {
      const elementMap = new Map(prevElements.map(el => [el.id, el]));
      const remoteEl = payload.element;
      
      // Update or add the element being drawn
      elementMap.set(remoteEl.id, remoteEl);
      
      return Array.from(elementMap.values());
    });
  };

  const handleRemoteMouseLocation = (payload) => {
    setRemoteCursors(prev => {
      const next = new Map(prev);
      next.set(payload.userId, {
        x: payload.x,
        y: payload.y,
        userName: payload.userName
      });
      return next;
    });
    
    // Remove cursor after 3 seconds of inactivity
    setTimeout(() => {
      setRemoteCursors(prev => {
        const next = new Map(prev);
        next.delete(payload.userId);
        return next;
      });
    }, 3000);
  };

  const handleUserLeft = (payload) => {
    setRemoteCursors(prev => {
      const next = new Map(prev);
      next.delete(payload.userId);
      return next;
    });
  };

  // Drawing functions
  const generateElement = (x1, y1, x2, y2, type) => {
    return {
      id: crypto.randomUUID(),
      type,
      x1,
      y1,
      x2,
      y2,
      strokeColor: '#000000',
      backgroundColor: '#ffffff',
      fillStyle: 'solid',
      strokeWidth: 2,
      roughness: 1,
      opacity: 100,
      version: 1,
      versionNonce: Math.random(),
      isDeleted: false
    };
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const element = generateElement(x, y, x, y, selectedTool);
    setCurrentElement(element);
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Send cursor position to other clients
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'MOUSE_LOCATION',
        payload: { x: e.clientX, y: e.clientY }
      }));
    }
    
    if (!isDrawing) return;
    
    const updatedElement = {
      ...currentElement,
      x2: x,
      y2: y,
      version: currentElement.version + 1
    };
    setCurrentElement(updatedElement);
    
    // 🔴 REAL-TIME: Broadcast while drawing (not just on mouseUp)
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'SCENE_UPDATE_DRAWING',  // New type for in-progress drawing
        payload: {
          element: updatedElement
        }
      }));
    }
    
    // Redraw
    drawCanvas([...elements, updatedElement]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentElement) return;
    
    const newElement = {
      ...currentElement,
      version: currentElement.version + 1
    };
    
    const updatedElements = [...elements, newElement];
    setElements(updatedElements);
    setIsDrawing(false);
    setCurrentElement(null);
    
    // Broadcast to other clients
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'SCENE_UPDATE',
        payload: {
          elements: [newElement]
        }
      }));
    }
    
    drawCanvas(updatedElements);
  };

  // Drawing on canvas
  useEffect(() => {
    drawCanvas(elements);
  }, [elements]);

  useEffect(() => {
    if (currentElement) {
      drawCanvas([...elements, currentElement]);
    }
  }, [currentElement]);

  const drawCanvas = (elementsToDraw) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    elementsToDraw.forEach(element => {
      if (element.isDeleted) return;
      
      ctx.strokeStyle = element.strokeColor;
      ctx.lineWidth = element.strokeWidth;
      
      switch (element.type) {
        case 'rectangle':
          drawRectangle(ctx, element);
          break;
        case 'ellipse':
          drawEllipse(ctx, element);
          break;
        case 'line':
          drawLine(ctx, element);
          break;
        case 'arrow':
          drawArrow(ctx, element);
          break;
      }
    });
    
    // Draw remote cursors
    remoteCursors.forEach((cursor, userId) => {
      drawRemoteCursor(ctx, cursor);
    });
  };

  const drawRectangle = (ctx, element) => {
    const width = element.x2 - element.x1;
    const height = element.y2 - element.y1;
    ctx.strokeRect(element.x1, element.y1, width, height);
  };

  const drawEllipse = (ctx, element) => {
    const centerX = (element.x1 + element.x2) / 2;
    const centerY = (element.y1 + element.y2) / 2;
    const radiusX = Math.abs(element.x2 - element.x1) / 2;
    const radiusY = Math.abs(element.y2 - element.y1) / 2;
    
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const drawLine = (ctx, element) => {
    ctx.beginPath();
    ctx.moveTo(element.x1, element.y1);
    ctx.lineTo(element.x2, element.y2);
    ctx.stroke();
  };

  const drawArrow = (ctx, element) => {
    const headLength = 20;
    const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1);
    
    ctx.beginPath();
    ctx.moveTo(element.x1, element.y1);
    ctx.lineTo(element.x2, element.y2);
    ctx.stroke();
    
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(element.x2, element.y2);
    ctx.lineTo(
      element.x2 - headLength * Math.cos(angle - Math.PI / 6),
      element.y2 - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(element.x2, element.y2);
    ctx.lineTo(
      element.x2 - headLength * Math.cos(angle + Math.PI / 6),
      element.y2 - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const drawRemoteCursor = (ctx, cursor) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = cursor.x - rect.left;
    const y = cursor.y - rect.top;
    
    // Draw cursor circle
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw username
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.fillText(cursor.userName || 'Anonymous', x + 12, y - 5);
  };

  // Save and share
  const saveScene = async () => {
    if (!encryptionKey) return;
    
    const sceneData = JSON.stringify({ elements });
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(sceneData);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      encryptionKey,
      encoded
    );
    
    const blob = new Uint8Array(iv.length + encrypted.byteLength);
    blob.set(iv, 0);
    blob.set(new Uint8Array(encrypted), iv.length);
    
    const response = await fetch('http://localhost:3000/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: blob
    });
    
    const { id } = await response.json();
    console.log('Scene saved with ID:', id);
    alert('Scene saved! Share this URL: ' + shareUrl);
  };

  const clearCanvas = () => {
    setElements([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center gap-3 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTool('rectangle')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              selectedTool === 'rectangle'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Rectangle
          </button>
          <button
            onClick={() => setSelectedTool('ellipse')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              selectedTool === 'ellipse'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Ellipse
          </button>
          <button
            onClick={() => setSelectedTool('line')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              selectedTool === 'line'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setSelectedTool('arrow')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              selectedTool === 'arrow'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Arrow
          </button>
        </div>
        
        <div className="h-8 w-px bg-gray-300 mx-2" />
        
        <button
          onClick={clearCanvas}
          className="px-4 py-2 rounded font-medium bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
        >
          Clear
        </button>
        
        <button
          onClick={saveScene}
          className="px-4 py-2 rounded font-medium bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
        >
          Save & Share
        </button>
        
        <div className="ml-auto flex items-center gap-2">
          <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm font-mono">
            Room: {roomId.slice(0, 8)}...
          </div>
          <div className="px-3 py-1 bg-green-50 text-green-700 rounded text-sm">
            {remoteCursors.size + 1} user{remoteCursors.size !== 0 ? 's' : ''} online
          </div>
        </div>
      </div>
      
      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight - 70}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="cursor-crosshair bg-white"
        />
      </div>
      
      {/* Info */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded shadow-lg text-sm">
        <div className="font-semibold mb-1">How to use:</div>
        <div className="text-gray-600">
          • Select a tool and draw on the canvas<br/>
          • Share the URL to collaborate in real-time<br/>
          • See others' cursors and drawings live
        </div>
      </div>
    </div>
  );
};

export default ExcalidrawClone;