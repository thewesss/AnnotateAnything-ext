// @content.js

(function() {
    console.log('content.js: Script started.');
    // Prevent multiple injections
    if (document.getElementById('drawing-toolbar-extension')) {
        console.log('content.js: Toolbar already exists, preventing re-injection.');
        return;
    }
    // --- Configuration ---
    const TOOLBAR_ID = 'drawing-toolbar-extension';
    const CANVAS_ID = 'drawing-canvas-extension';
    const PREFIX = 'dt-';
    const INVITE_DIALOG_ID = 'dt-invite-dialog';
    const EXPORT_DIALOG_ID = 'dt-export-choice-dialog';
    const SHARE_DIALOG_ID = 'dt-share-dialog';
    const INVITE_URL_BASE = 'https://annotateweb.com/?join=';
    const SHARE_API_BASE = 'https://annotateweb.maximsurfly.workers.dev/';

    // --- State ---
    let currentTool = 'navigate';
    let currentColor = '#6200d9';
    let currentLineWidth = 5;
    let isDrawing = false;
    let startX, startY;
    let canvas, ctx;
    let snapshot;
    let drawingOperations = [];
    let undoStack = [];
    let currentPath = null;

    let isDraggingToolbar = false;
    let toolbarOffsetX, toolbarOffsetY;

    // --- Helper Functions ---
    function hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function generateShortId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    function getDocumentRelativeCoordinates(event) {
        if (event.touches && event.touches.length > 0) {
            return {
                x: event.touches[0].clientX + window.scrollX,
                y: event.touches[0].clientY + window.scrollY
            };
        } else if (event.changedTouches && event.changedTouches.length > 0) {
            return {
                x: event.changedTouches[0].clientX + window.scrollX,
                y: event.changedTouches[0].clientY + window.scrollY
            };
        }
        return {
            x: event.clientX + window.scrollX,
            y: event.clientY + window.scrollY
        };
    }

    function drawAnnotationsOnCanvas(targetCtx, operations, offsetX = 0, offsetY = 0) {
        if (!targetCtx || !operations) return;

        operations.forEach(op => {
            targetCtx.strokeStyle = op.color;
            targetCtx.fillStyle = op.color;
            targetCtx.lineWidth = op.lineWidth;
            targetCtx.globalCompositeOperation = op.compositeOperation || 'source-over';

            targetCtx.beginPath();

            if (op.tool === 'pen' || op.tool === 'eraser' || op.tool === 'highlight') {
                if (op.points && op.points.length > 0) {
                    const firstPoint = op.points[0];
                    targetCtx.moveTo(firstPoint.x - offsetX, firstPoint.y - offsetY);
                    for (let i = 1; i < op.points.length; i++) {
                        const point = op.points[i];
                        targetCtx.lineTo(point.x - offsetX, point.y - offsetY);
                    }
                    targetCtx.stroke();
                }
            } else if (op.tool === 'rectangle') {
                targetCtx.strokeRect(
                    op.startX - offsetX,
                    op.startY - offsetY,
                    op.endX - op.startX,
                    op.endY - op.startY
                );
            } else if (op.tool === 'line') {
                targetCtx.moveTo(op.startX - offsetX, op.startY - offsetY);
                targetCtx.lineTo(op.endX - offsetX, op.endY - offsetY);
                targetCtx.stroke();
            } else if (op.tool === 'circle') {
                targetCtx.arc(
                    op.centerX - offsetX,
                    op.centerY - offsetY,
                    op.radius,
                    0,
                    2 * Math.PI
                );
                targetCtx.stroke();
            } else if (op.tool === 'text') {
                targetCtx.font = op.font;
                const fontSize = parseFloat(op.font) || 16;
                targetCtx.fillText(op.text, op.x - offsetX, op.y - offsetY + fontSize);
            }
        });
        targetCtx.globalCompositeOperation = 'source-over';
    }

    // --- UI Creation ---
    function createToolbar() {
        console.log('content.js: Creating toolbar elements.');
        const toolbar = document.createElement('div');
        toolbar.id = TOOLBAR_ID;
        toolbar.className = `${PREFIX}toolbar`;
        toolbar.innerHTML = `
            <div class="${PREFIX}toolbar-rows">
                <div class="${PREFIX}tool-group">
                    <button data-tool="navigate" class="${PREFIX}tool-button" title="Navigate Website">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 4.1L12 6M5.1 8l-2.9-.8M6 12l-1.9 2M7.2 2.2L8 5.1m1.037 4.59a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"/></svg>
                    </button>
                    <button data-tool="highlight" class="${PREFIX}tool-button" title="Highlight">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m9 11l-6 6v3h9l3-3"/><path d="m22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></g></svg>
                    </button>
                    <button data-tool="pen" class="${PREFIX}tool-button" title="Pen">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
                    </button>
                    <button data-tool="line" class="${PREFIX}tool-button" title="Line">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 20h9M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
                    </button>
                    <button data-tool="rectangle" class="${PREFIX}tool-button" title="Rectangle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><rect width="20" height="12" x="2" y="6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" rx="2"/></svg>
                    </button>
                    <button data-tool="circle" class="${PREFIX}tool-button" title="Circle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
                    </button>
                    <button data-tool="text" class="${PREFIX}tool-button" title="Text">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 22h-1a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4h1M7 22h1a4 4 0 0 0 4-4v-1M7 2h1a4 4 0 0 1 4 4v1"/></svg>
                    </button>
                    <button data-tool="eraser" class="${PREFIX}tool-button" title="Eraser">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21m9 0H7M5 11l9 9"/></svg>️
                    </button>
                </div>
                <div class="${PREFIX}drag-handle"></div>
            </div>
            
            <div class="${PREFIX}toolbar-row">
                <div class="${PREFIX}tool-group ${PREFIX}actions">
                    <button id="${PREFIX}export-button" class="${PREFIX}tool-button" title="Export to Image">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></g></svg>
                    </button>
                    <button id="${PREFIX}share-button" class="${PREFIX}tool-button" title="Share Annotations">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></g></svg>
                    </button>
                    <button id="${PREFIX}invite-button" class="${PREFIX}tool-button" title="Invite">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></g></svg>
                    </button>
                    <button id="${PREFIX}undo-button" class="${PREFIX}tool-button" title="Undo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14 4 9l5-5M4 9h11c4 0 6 2 6 6s-2 6-6 6h-5"/></svg>
                    </button>
                    <button id="${PREFIX}redo-button" class="${PREFIX}tool-button" title="Redo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 14 5-5-5-5M20 9H9c-4 0-6 2-6 6s2 6 6 6h5"/></svg>
                    </button>
                    <button id="${PREFIX}clear-button" class="${PREFIX}tool-button" title="Clear Canvas">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 5v6m4-6v6"/></svg>️
                    </button>
                </div>
                <div class="${PREFIX}tool-group">
                    <input type="color" id="${PREFIX}color-picker" value="${currentColor}" title="Color Picker">
                    <select id="${PREFIX}line-width" title="Line Width">
                        <option value="3">3px</option>
                        <option value="5" selected>5px</option>
                        <option value="8">8px</option>
                        <option value="12">12px</option>
                        <option value="20">20px</option>
                    </select>
                </div>
            </div>
        `;
        document.body.appendChild(toolbar);
        console.log('content.js: Toolbar HTML appended to body.');

        const dragHandle = toolbar.querySelector(`.${PREFIX}drag-handle`);
        if (dragHandle) {
            dragHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                isDraggingToolbar = true;
                const currentRect = toolbar.getBoundingClientRect();
                toolbarOffsetX = e.clientX - currentRect.left;
                toolbarOffsetY = e.clientY - currentRect.top;
                toolbar.style.transform = 'none';
                toolbar.style.left = `${currentRect.left}px`;
                toolbar.style.top = `${currentRect.top}px`;
                toolbar.style.bottom = 'auto';
            });
            
            dragHandle.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                isDraggingToolbar = true;
                const currentRect = toolbar.getBoundingClientRect();
                toolbarOffsetX = e.touches[0].clientX - currentRect.left;
                toolbarOffsetY = e.touches[0].clientY - currentRect.top;
                toolbar.style.transform = 'none';
                toolbar.style.left = `${currentRect.left}px`;
                toolbar.style.top = `${currentRect.top}px`;
                toolbar.style.bottom = 'auto';
                dragHandle.style.cursor = 'grabbing';
                document.body.style.userSelect = 'none';
                e.preventDefault();
            });
        }
        
        toolbar.querySelectorAll(`.${PREFIX}tool-button[data-tool]`).forEach(button => {
            button.addEventListener('click', () => selectTool(button.dataset.tool));
        });
        document.getElementById(`${PREFIX}color-picker`).addEventListener('input', (e) => {
            currentColor = e.target.value;
            if (ctx) {
                ctx.strokeStyle = currentColor;
                ctx.fillStyle = currentColor;
            }
            if (currentTool !== 'navigate') applyToolSettings();
            selectTool(currentTool);
        });

        document.getElementById(`${PREFIX}line-width`).addEventListener('change', (e) => {
            currentLineWidth = parseInt(e.target.value, 10);
            if (ctx) ctx.lineWidth = currentLineWidth;
            if (currentTool !== 'navigate') applyToolSettings();
            selectTool(currentTool);
        });

        document.getElementById(`${PREFIX}undo-button`).addEventListener('click', undoOperation);
        document.getElementById(`${PREFIX}redo-button`).addEventListener('click', redoOperation);
        document.getElementById(`${PREFIX}clear-button`).addEventListener('click', clearCanvas);
        console.log('content.js: Toolbar event listeners attached.');
    }

    function addGlobalDragListeners() {
        console.log('content.js: Adding global drag listeners.');
        window.addEventListener('mousemove', (e) => {
            if (isDraggingToolbar) {
                const tb = document.getElementById(TOOLBAR_ID);
                if (!tb) {
                    isDraggingToolbar = false;
                    return;
                }
                let newX = e.clientX - toolbarOffsetX;
                let newY = e.clientY - toolbarOffsetY;

                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const toolbarRect = tb.getBoundingClientRect();

                if (newX < 0) newX = 0;
                if (newY < 0) newY = 0;
                if (newX + toolbarRect.width > viewportWidth) newX = viewportWidth - toolbarRect.width;
                if (newY + toolbarRect.height > viewportHeight) newY = viewportHeight - toolbarRect.height;

                tb.style.left = `${newX}px`;
                tb.style.top = `${newY}px`;
                e.preventDefault();
            }
        }, { passive: false });
        
        window.addEventListener('touchmove', (e) => {
            if (isDraggingToolbar) {
                e.preventDefault();
                const tb = document.getElementById(TOOLBAR_ID);
                if (!tb || !e.touches || e.touches.length === 0) {
                    isDraggingToolbar = false;
                    return;
                }
                let newX = e.touches[0].clientX - toolbarOffsetX;
                let newY = e.touches[0].clientY - toolbarOffsetY;

                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const toolbarRect = tb.getBoundingClientRect();

                if (newX < 0) newX = 0;
                if (newY < 0) newY = 0;
                if (newX + toolbarRect.width > viewportWidth) newX = viewportWidth - toolbarRect.width;
                if (newY + toolbarRect.height > viewportHeight) newY = viewportHeight - toolbarRect.height;

                tb.style.left = `${newX}px`;
                tb.style.top = `${newY}px`;
            }
        }, { passive: false });

        window.addEventListener('mouseup', (e) => {
            if (isDraggingToolbar) {
                isDraggingToolbar = false;
                const tb = document.getElementById(TOOLBAR_ID);
                if (tb) {
                    const dragHandle = tb.querySelector(`.${PREFIX}drag-handle`);
                    if (dragHandle) dragHandle.style.cursor = 'grab';
                }
                document.body.style.userSelect = '';
            }
        });
        
        window.addEventListener('touchend', (e) => {
            if (isDraggingToolbar) {
                isDraggingToolbar = false;
                const tb = document.getElementById(TOOLBAR_ID);
                if (tb) {
                    const dragHandle = tb.querySelector(`.${PREFIX}drag-handle`);
                    if (dragHandle) dragHandle.style.cursor = 'grab';
                }
                document.body.style.userSelect = '';
            }
        });
        
        window.addEventListener('touchcancel', (e) => {
            if (isDraggingToolbar) {
                isDraggingToolbar = false;
                const tb = document.getElementById(TOOLBAR_ID);
                if (tb) {
                    const dragHandle = tb.querySelector(`.${PREFIX}drag-handle`);
                    if (dragHandle) dragHandle.style.cursor = 'grab';
                }
                document.body.style.userSelect = '';
            }
        });
    }

    function createCanvas() {
        console.log('content.js: Creating canvas elements.');
        canvas = document.createElement('canvas');
        canvas.id = CANVAS_ID;
        canvas.className = `${PREFIX}canvas`;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '2147483645';
        canvas.style.pointerEvents = 'none';

        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');

        applyToolSettings();

        canvas.addEventListener('mousedown', startDrawing);
        window.addEventListener('mousemove', draw);
        window.addEventListener('mouseup', stopDrawing);
        window.addEventListener('mouseleave', stopDrawingOnLeave);
        
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        window.addEventListener('touchmove', draw, { passive: false });
        window.addEventListener('touchend', stopDrawing);
        window.addEventListener('touchcancel', stopDrawingOnLeave);
        console.log('content.js: Canvas event listeners attached.');
    }

    function applyToolSettings() {
        if (!ctx || !canvas) return;

        if (currentTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = Math.max(5, currentLineWidth * 1.5);
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else if (currentTool === 'highlight') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = Math.max(8, currentLineWidth * 2);
            ctx.strokeStyle = hexToRgba(currentColor, 0.4);
            ctx.fillStyle = hexToRgba(currentColor, 0.4);
        } else if (currentTool === 'text') {
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = currentLineWidth;
            ctx.strokeStyle = currentColor;
            ctx.fillStyle = currentColor;
        }
    }

    function selectTool(tool) {
        currentTool = tool;
        const buttons = document.querySelectorAll(`.${PREFIX}tool-button`);
        buttons.forEach(button => button.classList.remove(`${PREFIX}active`));
        const selectedButton = document.querySelector(`.${PREFIX}tool-button[data-tool="${tool}"]`);
        if (selectedButton) {
            selectedButton.classList.add(`${PREFIX}active`);
        }

        if (!canvas) return;

        switch (tool) {
            case 'pen':
            case 'line':
            case 'rectangle':
            case 'circle':
            case 'highlight':
            case 'eraser':
            case 'text':
                canvas.style.cursor = (tool === 'text') ? 'text' : 'crosshair';
                canvas.style.pointerEvents = 'auto';
                break;
            case 'navigate':
            default:
                canvas.style.cursor = 'default';
                canvas.style.pointerEvents = 'none';
                break;
        }

        const existingInput = document.getElementById(`${PREFIX}text-input`);
        if (existingInput && tool !== 'text') {
            drawTextAndRemoveInput(existingInput, false);
        }

        applyToolSettings();
    }

    function startDrawing(e) {
        if (e.type === 'touchstart' && currentTool !== 'navigate') {
            e.preventDefault();
        } else if (e.type === 'mousedown' && e.button !== 0) {
            return;
        }
        
        if (isDraggingToolbar) return;

        const docCoords = getDocumentRelativeCoordinates(e);
        startX = docCoords.x;
        startY = docCoords.y;

        if (currentTool === 'navigate') return;

        if (currentTool === 'text') {
            handleTextToolClick(startX, startY);
            return;
        }

        isDrawing = true;

        applyToolSettings();

        if (currentTool === 'pen' || currentTool === 'eraser' || currentTool === 'highlight') {
            currentPath = {
                tool: currentTool,
                points: [{ x: startX, y: startY }],
                color: currentTool === 'highlight' ? hexToRgba(currentColor, 0.4) : currentColor,
                lineWidth: ctx.lineWidth,
                compositeOperation: ctx.globalCompositeOperation
            };
            ctx.lineWidth = currentPath.lineWidth;
            ctx.globalCompositeOperation = currentPath.compositeOperation;
        } else if (['rectangle', 'circle', 'line'].includes(currentTool)) {
            snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }

        ctx.beginPath();
        ctx.moveTo(e.clientX, e.clientY);
    }

    function draw(e) {
        if (e.type === 'touchmove' && isDrawing) {
            e.preventDefault();
        }
        
        if (!isDrawing && !isDraggingToolbar) return;

        if (isDraggingToolbar) {
            const toolbar = document.getElementById(TOOLBAR_ID);
            if (!toolbar) {
                isDraggingToolbar = false;
                return;
            }
            let newX = e.clientX - toolbarOffsetX;
            let newY = e.clientY - toolbarOffsetY;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const toolbarRect = toolbar.getBoundingClientRect();

            if (newX < 0) newX = 0;
            if (newY < 0) newY = 0;
            if (newX + toolbarRect.width > viewportWidth) newX = viewportWidth - toolbarRect.width;
            if (newY + toolbarRect.height > viewportHeight) newY = viewportHeight - toolbarRect.height;

            toolbar.style.left = `${newX}px`;
            toolbar.style.top = `${newY}px`;
            return;
        }

        if (!isDrawing) return;

        const docCoords = getDocumentRelativeCoordinates(e);
        const currX = docCoords.x;
        const currY = docCoords.y;

        const viewportCurrentX = e.clientX;
        const viewportCurrentY = e.clientY;
        const viewportStartX = startX - window.scrollX;
        const viewportStartY = startY - window.scrollY;

        if (currentTool === 'pen' || currentTool === 'eraser' || currentTool === 'highlight') {
            if (currentPath) {
                currentPath.points.push({ x: docCoords.x, y: docCoords.y });
            }
            ctx.lineTo(viewportCurrentX, viewportCurrentY);
            ctx.stroke();
        } else if (snapshot && (currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'line')) {
            ctx.putImageData(snapshot, 0, 0);
            ctx.beginPath();
            ctx.moveTo(viewportStartX, viewportStartY);

            if (currentTool === 'rectangle') {
                ctx.strokeRect(
                    viewportStartX,
                    viewportStartY,
                    viewportCurrentX - viewportStartX,
                    viewportCurrentY - viewportStartY
                );
            } else if (currentTool === 'circle') {
                const radius = Math.sqrt(Math.pow(viewportCurrentX - viewportStartX, 2) + Math.pow(viewportCurrentY - viewportStartY, 2));
                ctx.arc(viewportStartX, viewportStartY, radius, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (currentTool === 'line') {
                ctx.lineTo(viewportCurrentX, viewportCurrentY);
                ctx.stroke();
            }
        }
    }

    function stopDrawing(e) {
        if (e.type === 'mouseleave' && !isDrawing) return;
        if (e.type === 'mouseup' && e.button !== 0) return;
        
        if (!isDrawing) {
            return;
        }

        isDrawing = false;
        const docCoords = getDocumentRelativeCoordinates(e);
        
        undoStack = [];

        if (currentTool === 'pen' || currentTool === 'eraser' || currentTool === 'highlight') {
            if (currentPath) {
                currentPath.points.push({ x: docCoords.x, y: docCoords.y });

                if (currentPath.points.length > 1) {
                    drawingOperations.push(currentPath);
                }
                currentPath = null;
            }
            if (currentTool === 'eraser') {
                ctx.globalCompositeOperation = 'source-over';
            }
        } else if (['rectangle', 'circle', 'line'].includes(currentTool)) {
            if (snapshot) {
                ctx.putImageData(snapshot, 0, 0);
                snapshot = null;
            }

            let operation = {
                tool: currentTool,
                color: currentColor,
                lineWidth: currentLineWidth,
                startX: startX,
                startY: startY,
                endX: docCoords.x,
                endY: docCoords.y,
            };

            if (currentTool === 'circle') {
                const radius = Math.sqrt(Math.pow(docCoords.x - startX, 2) + Math.pow(docCoords.y - startY, 2));
                operation.centerX = startX;
                operation.centerY = startY;
                operation.radius = radius;
                delete operation.endX;
                delete operation.endY;
            }
            if (currentTool === 'rectangle' && (startX === docCoords.x || startY === docCoords.y)) { /* no op */ }
            else if (currentTool === 'line' && startX === docCoords.x && startY === docCoords.y) { /* no op */ }
            else if (currentTool === 'circle' && operation.radius === 0) { /* no op */ }
            else {
                drawingOperations.push(operation);
            }
        }

        if (currentTool !== 'text') {
             redrawVisibleAnnotations();
        }

        ctx.beginPath();
        applyToolSettings();
    }

    function stopDrawingOnLeave(e) {
        if (isDrawing && e.target.nodeName === 'HTML' && !isDraggingToolbar) {
            stopDrawing(e);
        }
    }

    function clearCanvas() {
        if (drawingOperations.length > 0) {
            undoStack = [];
            undoStack.push([...drawingOperations]);
            drawingOperations = [];
            redrawVisibleAnnotations();
        }
    }
    
    function undoOperation() {
        if (drawingOperations.length > 0) {
            const lastOperation = drawingOperations.pop();
            
            if (!undoStack.length || undoStack[undoStack.length - 1].constructor !== Array) {
                undoStack.push([]);
            }
            
            undoStack[undoStack.length - 1].unshift(lastOperation);
            
            redrawVisibleAnnotations();
        } else {
        }
    }
    
    function redoOperation() {
        if (undoStack.length > 0 && undoStack[undoStack.length - 1].length > 0) {
            const lastUndoStack = undoStack[undoStack.length - 1];
            
            const operationToRedo = lastUndoStack.shift();
            drawingOperations.push(operationToRedo);
            
            if (lastUndoStack.length === 0) {
                undoStack.pop();
            }
            
            redrawVisibleAnnotations();
        } else {
        }
    }

    function handleResize() {
        if (!canvas || !ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const toolbar = document.getElementById(TOOLBAR_ID);
        if (toolbar) {
            const rect = toolbar.getBoundingClientRect();
            if (rect.right > window.innerWidth || rect.bottom > window.innerHeight || 
                rect.left < 0 || rect.top < 0) {
                if (window.innerWidth <= 480) {
                    toolbar.style.left = '10px';
                    toolbar.style.right = '10px';
                    toolbar.style.top = 'auto';
                    toolbar.style.bottom = '10px';
                    toolbar.style.transform = 'none'; 
                } else {
                    toolbar.style.left = '50%';
                    toolbar.style.top = '20px';
                    toolbar.style.transform = 'translateX(-50%)'; 
                }
            }
        }

        applyToolSettings();
        redrawVisibleAnnotations();
    }

    function handleKeyPress(e) {
        if (e.key === "Escape" && currentTool !== 'navigate') {
            selectTool('navigate');
            e.preventDefault();
        }
    }

    function handleTextToolClick(x, y) {
        const existingInput = document.getElementById(`${PREFIX}text-input`);
        if (existingInput) {
            drawTextAndRemoveInput(existingInput, false);
        }

        const input = document.createElement('textarea');
        input.id = `${PREFIX}text-input`;
        input.className = `${PREFIX}text-input`;
        input.placeholder = 'Type your text here...'; 
        
        const viewportX = x - window.scrollX;
        const viewportY = y - window.scrollY;
        
        const inputWidth = 150;
        const inputHeight = 40;
        const adjustedX = Math.max(0, viewportX - (inputWidth / 2));
        const adjustedY = Math.max(0, viewportY - (inputHeight / 2));
        
        input.style.left = `${adjustedX}px`;
        input.style.top = `${adjustedY}px`;

        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.body.contains(input)) {
                    drawTextAndRemoveInput(input, true);
                }
            }, 100);
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                drawTextAndRemoveInput(input, true);
                e.preventDefault();
            } 
            else if (e.key === 'Escape') {
                drawTextAndRemoveInput(input, false);
                e.preventDefault();
            }
        });

        document.body.appendChild(input);
        
        setTimeout(() => {
            input.focus();
            input.style.height = 'auto';
        }, 10);
    }

    function drawTextAndRemoveInput(inputElement, drawIt) {
        if (!inputElement) return;
        const text = inputElement.value.trim();

        const docX = parseFloat(inputElement.style.left);
        const docY = parseFloat(inputElement.style.top);

        if (drawIt && text) {
            const textLines = text.split('\n');
            const fontSize = 18;
            const lineHeight = fontSize * 1.2;
            
            textLines.forEach((line, index) => {
                if (line.trim()) {
                    const textOperation = {
                        tool: 'text',
                        text: line,
                        x: startX,
                        y: startY + (index * lineHeight),
                        color: currentColor,
                        font: `${fontSize}px Arial, sans-serif`,
                        lineHeight: lineHeight
                    };
                    drawingOperations.push(textOperation);
                }
            });
        }

        inputElement.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(inputElement)) {
                inputElement.remove();
            }
        }, 200);

        if (drawIt && text) {
            redrawVisibleAnnotations();
        }
    }

    async function getSessionId() {
        try {
            const sessionInfo = await browser.webfuseSession.getSessionInfo();
            console.log('Session info:', sessionInfo);
            return sessionInfo.sessionId || '';
        } catch (e) {
            console.error('Error getting session ID:', e);
            return '';
        }
    }
    
    async function createInviteDialog() {
        removeInviteDialog();
        
        const modalContainer = document.createElement('div');
        modalContainer.id = INVITE_DIALOG_ID;
        modalContainer.className = `${PREFIX}modal-container`;
        
        const modalContent = document.createElement('div');
        modalContent.className = `${PREFIX}modal-content`;
        
        const header = document.createElement('div');
        header.className = `${PREFIX}modal-header`;
        
        const title = document.createElement('h3');
        title.textContent = 'Invite to live session';
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.className = `${PREFIX}modal-close`;
        closeButton.addEventListener('click', removeInviteDialog);
        
        header.appendChild(title);
        header.appendChild(closeButton);
        
        const urlContainer = document.createElement('div');
        urlContainer.className = `${PREFIX}invite-url-container`;
        
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = 'Getting session ID...';
        urlInput.className = `${PREFIX}invite-url-input`;
        urlInput.readOnly = true;
        
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.className = `${PREFIX}invite-copy-button`;
        copyButton.disabled = true;
        copyButton.addEventListener('click', () => {
            urlInput.select();
            document.execCommand('copy');
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy';
            }, 2000);
        });
        
        urlContainer.appendChild(urlInput);
        urlContainer.appendChild(copyButton);
        
        modalContent.appendChild(header);
        modalContent.appendChild(urlContainer);
        
        modalContainer.appendChild(modalContent);
        document.body.appendChild(modalContainer);
        
        try {
            const sessionId = await getSessionId();
            if (sessionId) {
                const inviteUrl = INVITE_URL_BASE + sessionId;
                urlInput.value = inviteUrl;
                copyButton.disabled = false;
                
                setTimeout(() => {
                    urlInput.focus();
                    urlInput.select();
                }, 100);
            } else {
                urlInput.value = 'Could not get session ID';
                copyButton.disabled = true;
            }
        } catch (error) {
            console.error('Error in createInviteDialog:', error);
            urlInput.value = 'Error getting session ID';
        }
    }
    
    function removeInviteDialog() {
        const existingDialog = document.getElementById(INVITE_DIALOG_ID);
        if (existingDialog) {
            existingDialog.remove();
        }
    }
    
    function handleInviteButtonClick() {
        selectTool('navigate');
        createInviteDialog().catch(error => {
            console.error('Error creating invite dialog:', error);
        });
    }

    async function saveAnnotationsToWorker(id, annotations) {
        try {
            const response = await fetch(`${SHARE_API_BASE}${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(annotations)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error saving annotations:', error);
            return false;
        }
    }

    async function loadAnnotationsFromWorker(id) {
        try {
            const response = await fetch(`${SHARE_API_BASE}${id}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error loading annotations:', error);
            return null;
        }
    }

    function createShareDialog() {
        removeShareDialog();
        
        if (drawingOperations.length === 0) {
            const messageDialog = document.createElement('div');
            messageDialog.id = SHARE_DIALOG_ID;
            messageDialog.className = `${PREFIX}modal-container`;
            messageDialog.innerHTML = `
                <div class="${PREFIX}modal-content">
                    <div class="${PREFIX}modal-header">
                        <h3>No Annotations to Share</h3>
                        <button class="${PREFIX}modal-close">&times;</button>
                    </div>
                    <p>Please draw some annotations first before sharing.</p>
                </div>
            `;
            
            document.body.appendChild(messageDialog);
            
            messageDialog.querySelector(`.${PREFIX}modal-close`).addEventListener('click', removeShareDialog);
            messageDialog.addEventListener('click', (e) => {
                if (e.target === messageDialog) removeShareDialog();
            });
            
            return;
        }
        
        const modalContainer = document.createElement('div');
        modalContainer.id = SHARE_DIALOG_ID;
        modalContainer.className = `${PREFIX}modal-container`;
        
        const modalContent = document.createElement('div');
        modalContent.className = `${PREFIX}modal-content`;
        
        const header = document.createElement('div');
        header.className = `${PREFIX}modal-header`;
        
        const title = document.createElement('h3');
        title.textContent = 'Share Annotations';
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.className = `${PREFIX}modal-close`;
        closeButton.addEventListener('click', removeShareDialog);
        
        header.appendChild(title);
        header.appendChild(closeButton);
        
        const urlContainer = document.createElement('div');
        urlContainer.className = `${PREFIX}share-url-container`;
        
        const resolutionInfo = document.createElement('p');
        resolutionInfo.className = `${PREFIX}share-resolution-info`;
        resolutionInfo.textContent = `Created for ${window.innerWidth}x${window.innerHeight} resolution`;
        
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = 'Generating share URL...';
        urlInput.className = `${PREFIX}share-url-input`;
        urlInput.readOnly = true;
        
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.className = `${PREFIX}share-copy-button`;
        copyButton.disabled = true;
        copyButton.addEventListener('click', () => {
            urlInput.select();
            navigator.clipboard.writeText(urlInput.value).then(() => {
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                }, 2000);
            }).catch(() => {
                document.execCommand('copy');
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                }, 2000);
            });
        });
        
        const inputGroup = document.createElement('div');
        inputGroup.appendChild(urlInput);
        inputGroup.appendChild(copyButton);
        
        urlContainer.appendChild(resolutionInfo);
        urlContainer.appendChild(inputGroup);
        
        modalContent.appendChild(header);
        modalContent.appendChild(urlContainer);
        
        modalContainer.appendChild(modalContent);
        document.body.appendChild(modalContainer);
        
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) removeShareDialog();
        });
        
        generateShareUrl(urlInput, copyButton);
    }

    async function generateShareUrl(urlInput, copyButton) {
        try {
            const id = generateShortId();
            const width = window.innerWidth;
            
            const success = await saveAnnotationsToWorker(id, drawingOperations);
            
            if (success) {
                const currentUrl = window.location.href.split('#')[0];
                const dataToEncode = currentUrl + '#ant=' + `${width}=${id}`;
                const encodedString = btoa(dataToEncode);
                const shareUrl = `https://annotateweb.com/?view=${encodedString}`;
                
                urlInput.value = shareUrl;
                copyButton.disabled = false;
                
                setTimeout(() => {
                    urlInput.focus();
                    urlInput.select();
                }, 100);
            } else {
                urlInput.value = 'Error generating share URL';
                copyButton.disabled = true;
            }
        } catch (error) {
            console.error('Error in generateShareUrl:', error);
            urlInput.value = 'Error generating share URL';
            copyButton.disabled = true;
        }
    }

    function removeShareDialog() {
        const existingDialog = document.getElementById(SHARE_DIALOG_ID);
        if (existingDialog) {
            existingDialog.remove();
        }
    }

    function handleShareButtonClick() {
        selectTool('navigate');
        createShareDialog();
    }

    function parseUrlHash() {
        const hash = window.location.hash;
        if (hash.startsWith('#ant=')) {
            const params = hash.substring(5);
            const parts = params.split('=');
            if (parts.length === 2) {
                const width = parseInt(parts[0]);
                const id = parts[1];
                return { width, id };
            }
        }
        return null;
    }

    async function loadSharedAnnotations() {
        const hashParams = parseUrlHash();
        if (hashParams) {
            const { width, id } = hashParams;
            console.log(`Loading shared annotations: width=${width}, id=${id}`);
            
            try {
                const annotations = await loadAnnotationsFromWorker(id);
                if (annotations && Array.isArray(annotations)) {
                    drawingOperations = [];
                    undoStack = [];
                    
                    drawingOperations = annotations;
                    
                    redrawVisibleAnnotations();
                    
                    console.log(`Loaded ${annotations.length} shared annotations`);
                } else {
                    console.warn('No annotations found for ID:', id);
                }
            } catch (error) {
                console.error('Error loading shared annotations:', error);
            }
        }
    }
    
    function removeExportChoiceDialog() {
        const dialog = document.getElementById(EXPORT_DIALOG_ID);
        if (dialog) {
            dialog.remove();
        }
    }

    async function capturePageAndDownload(captureType) {
        removeExportChoiceDialog();

        const toolbar = document.getElementById(TOOLBAR_ID);
        let wasToolbarVisible = false;
        if (toolbar) {
            wasToolbarVisible = toolbar.style.display !== 'none';
            toolbar.style.display = 'none';
        }
        if (canvas) canvas.style.border = 'none';

        try {
            let targetElement;
            let html2canvasOptions = {
                useCORS: true,
                logging: true,
                allowTaint: false,
                onclone: (clonedDoc) => {
                    const clonedDrawingCanvas = clonedDoc.getElementById(CANVAS_ID);
                    if (clonedDrawingCanvas) {
                        clonedDrawingCanvas.style.zIndex = '2147483647';
                    } else {
                        console.warn('Drawing canvas NOT found in cloned document.');
                    }

                    if (html2canvasOptions.windowHeight === clonedDoc.documentElement.scrollHeight) {
                        clonedDoc.documentElement.scrollTop = 0;
                        clonedDoc.body.scrollTop = 0;
                        clonedDoc.documentElement.style.marginTop = '0px';
                        clonedDoc.documentElement.style.paddingTop = '0px';
                        clonedDoc.body.style.marginTop = '0px';
                        clonedDoc.body.style.paddingTop = '0px';
                    }
                }
            };

            if (captureType === 'full') {
                targetElement = document.documentElement;
                html2canvasOptions.windowWidth = document.documentElement.scrollWidth;
                html2canvasOptions.windowHeight = document.documentElement.scrollHeight;
                html2canvasOptions.x = 0;
                html2canvasOptions.y = 0;
                html2canvasOptions.scrollX = 0;
                html2canvasOptions.scrollY = 0;
            } else { // 'visible'
                targetElement = document.documentElement;
                html2canvasOptions.x = window.scrollX;
                html2canvasOptions.y = window.scrollY;
                html2canvasOptions.width = document.documentElement.clientWidth;
                html2canvasOptions.height = document.documentElement.clientHeight;
                html2canvasOptions.windowWidth = document.documentElement.clientWidth;
                html2canvasOptions.windowHeight = document.documentElement.clientHeight;
            }

            const capturedCanvas = await html2canvas(targetElement, html2canvasOptions);

            if (captureType === 'full') {
                const capturedCtx = capturedCanvas.getContext('2d');
                drawAnnotationsOnCanvas(capturedCtx, drawingOperations, 0, 0);
            } else if (captureType === 'visible') {
                const capturedCtx = capturedCanvas.getContext('2d');
                drawAnnotationsOnCanvas(capturedCtx, drawingOperations, html2canvasOptions.x, html2canvasOptions.y);
            }

            const timestamp = new Date().toISOString().replace(/[\:\.]/g, '-');
            const filename = `screenshot-${captureType}-${timestamp}.png`;

            const link = document.createElement('a');
            link.download = filename;
            link.href = capturedCanvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Error during html2canvas capture or download:', error);
            alert(`Failed to export image: ${error.message || error}`);
        } finally {
            if (toolbar && wasToolbarVisible) {
                toolbar.style.display = '';
            }
            if (canvas) canvas.style.border = '1px solid #ccc';
        }
    }

    async function exportCanvasAsImage() {
        removeExportChoiceDialog();

        const dialog = document.createElement('div');
        dialog.id = EXPORT_DIALOG_ID;
        dialog.innerHTML = `
            <h3>Export Image (Experimental)</h3>
            <p>Choose capture area:</p>
            <button class="dt-export-visible">Visible Area</button>
            <button class="dt-export-full">Full Page</button>
            <button class="dt-export-cancel">Cancel</button>
        `;
        document.body.appendChild(dialog);

        dialog.querySelector('.dt-export-visible').addEventListener('click', () => {
            capturePageAndDownload('visible');
        });

        dialog.querySelector('.dt-export-full').addEventListener('click', () => {
            capturePageAndDownload('full');
        });

        dialog.querySelector('.dt-export-cancel').addEventListener('click', () => {
            removeExportChoiceDialog();
        });
    }

    // --- Initialization ---
    function init() {
        console.log('content.js: init function called.');
        // Styles are now injected by injectStyles.js directly, no need to call a function here.
        // The manifest.json load order ensures injectStyles.js runs before content.js

        try {
            createToolbar();
            createCanvas();
            addGlobalDragListeners();
            selectTool('navigate');

            window.addEventListener('resize', handleResize);
            window.addEventListener('keydown', handleKeyPress);
            window.addEventListener('scroll', redrawVisibleAnnotations, { passive: true });

            document.getElementById(TOOLBAR_ID).addEventListener('dragstart', (e) => e.preventDefault());

            const exportButton = document.getElementById(`${PREFIX}export-button`);
            if (exportButton) {
                exportButton.addEventListener('click', exportCanvasAsImage);
            } else {
                console.warn('content.js: Export button not found during init.');
            }
            
            const inviteButton = document.getElementById(`${PREFIX}invite-button`);
            if (inviteButton) {
                inviteButton.addEventListener('click', handleInviteButtonClick);
            } else {
                console.warn('content.js: Invite button not found during init.');
            }
            
            const shareButton = document.getElementById(`${PREFIX}share-button`);
            if (shareButton) {
                shareButton.addEventListener('click', handleShareButtonClick);
            } else {
                console.warn('content.js: Share button not found during init.');
            }
            console.log('content.js: All initialization steps completed.');
        } catch (error) {
            console.error('content.js: An error occurred during init:', error);
        }
    }

    function redrawVisibleAnnotations() {
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const viewportX = window.scrollX;
        const viewportY = window.scrollY;

        drawingOperations.forEach(op => {
            ctx.strokeStyle = op.color;
            ctx.fillStyle = op.color;
            ctx.lineWidth = op.lineWidth;
            ctx.globalCompositeOperation = op.compositeOperation || 'source-over';

            ctx.beginPath();

            if (op.tool === 'pen' || op.tool === 'eraser' || op.tool === 'highlight') {
                if (op.points && op.points.length > 0) {
                    const firstPoint = op.points[0];
                    ctx.moveTo(firstPoint.x - viewportX, firstPoint.y - viewportY);
                    for (let i = 1; i < op.points.length; i++) {
                        const point = op.points[i];
                        ctx.lineTo(point.x - viewportX, point.y - viewportY);
                    }
                    ctx.stroke();
                }
            } else if (op.tool === 'rectangle') {
                ctx.strokeRect(
                    op.startX - viewportX,
                    op.startY - viewportY,
                    op.endX - op.startX,
                    op.endY - op.startY
                );
            } else if (op.tool === 'line') {
                ctx.moveTo(op.startX - viewportX, op.startY - viewportY);
                ctx.lineTo(op.endX - viewportX, op.endY - viewportY);
                ctx.stroke();
            } else if (op.tool === 'circle') {
                ctx.arc(
                    op.centerX - viewportX,
                    op.centerY - viewportY,
                    op.radius,
                    0,
                    2 * Math.PI
                );
                ctx.stroke();
            } else if (op.tool === 'text') {
                ctx.font = op.font || '18px Arial, sans-serif';
                ctx.textBaseline = 'top';
                
                ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                
                ctx.fillText(op.text, op.x - viewportX, op.y - viewportY);
                
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }
        });

        ctx.globalCompositeOperation = 'source-over';
    }

    // Direct and robust initialization
    (function checkReadyAndInit() {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            console.log('content.js: Document is ready, calling init().');
            init();
            setTimeout(loadSharedAnnotations, 100);
        } else {
            console.log('content.js: Document not ready, waiting for DOMContentLoaded.');
            window.addEventListener('DOMContentLoaded', () => {
                console.log('content.js: DOMContentLoaded fired, calling init().');
                init();
                setTimeout(loadSharedAnnotations, 100);
            }, { once: true });
        }
    })();
})();