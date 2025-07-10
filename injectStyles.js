// @injectStyles.js

(function() {
    const PREFIX = 'dt-';
    const styleId = `${PREFIX}drawing-toolbar-styles`;
    const EXPORT_DIALOG_ID = 'dt-export-choice-dialog';

    // Only inject if it doesn't already exist
    if (document.getElementById(styleId)) {
        console.log('Drawing toolbar styles already injected.');
        return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .${PREFIX}toolbar {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(145deg, #2c3e50 0%, #1a252f 100%);
            border: 1px solid #11181f;
            border-top: 1px solid #4a5c6d;
            border-radius: 8px;
            padding: 5px 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0px rgba(255,255,255,0.05);
            z-index: 2147483646;
            font-family: 'Segoe UI', 'Roboto', sans-serif;
            color: #e0e0e0;
            cursor: grab;
            transition: opacity 0.3s, visibility 0.3s;
            max-width: calc(100% - 20px);
            width: auto;
        }
        
        .${PREFIX}toolbar-rows {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
        }
        
        .${PREFIX}toolbar-row {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            justify-content: flex-start;
        }
        .${PREFIX}toolbar.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }
        .${PREFIX}drag-handle {
            width: 20px; 
            height: 24px;
            background: repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px);
            margin-right: 5px;
            border-radius: 4px;
            cursor: grab;
            flex-shrink: 0;
        }
        .${PREFIX}tool-group {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            align-items: center;
            padding: 3px 5px;
            background: rgba(0,0,0,0.1);
            border-radius: 5px;
            min-width: 80px;
            justify-content: flex-start;
        }
        .${PREFIX}tool-group.${PREFIX}actions {
            background: transparent;
        }
        
        @media (max-width: 768px) {
            .${PREFIX}toolbar {
                top: auto;
                bottom: 10px;
                padding: 4px 6px;
            }
            .${PREFIX}tool-group {
                gap: 3px;
                padding: 2px 4px;
            }
        }
        
        @media (max-width: 480px) {
            .${PREFIX}toolbar {
                left: 10px;
                right: 10px;
                transform: none;
                width: calc(100% - 20px);
                max-width: none;
            }
            .${PREFIX}tool-button {
                padding: 5px 7px !important;
            }
            .${PREFIX}tool-group {
                flex-grow: 1;
                justify-content: center;
            }
        }
        .${PREFIX}tool-button {
            background: linear-gradient(to bottom, #3a4b5c, #2c3a47);
            border: 1px solid #1e2833;
            color: #d0d8e0;
            padding: 7px 9px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.15s ease-out;
            box-shadow: inset 0 1px 0px rgba(255,255,255,0.08), 0 1px 1px rgba(0,0,0,0.2);
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 34px;
            min-height: 34px;
        }
        .${PREFIX}tool-button:hover {
            background: linear-gradient(to bottom, #4a5f73, #364655);
            border-color: #2a3845;
            color: #ffffff;
        }
        .${PREFIX}tool-button.${PREFIX}active {
            background: linear-gradient(to bottom, #00bfff, #009acd);
            color: #ffffff;
            border-color: #007aa3;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 0px rgba(255,255,255,0.1);
        }
        .${PREFIX}tool-button[data-tool="navigate"].${PREFIX}active {
            background: linear-gradient(to bottom, #8e44ad, #7d3c98);
            border-color: #6c3483;
            font-weight: bold;
        }
        
        .${PREFIX}tool-button[data-tool="navigate"].${PREFIX}active:hover {
            background: linear-gradient(to bottom, #a569bd, #8e44ad);
            border-color: #5b2c6f;
        }

        #${PREFIX}color-picker {
            width: 36px;
            height: 32px;
            border: 1px solid #1e2833;
            border-radius: 4px;
            padding: 0;
            cursor: pointer;
            background-color: #2c3a47;
            box-shadow: inset 0 1px 0px rgba(255,255,255,0.05);
            min-width: 34px;
            min-height: 34px;
        }
        #${PREFIX}color-picker::-webkit-color-swatch-wrapper { padding: 2px; }
        #${PREFIX}color-picker::-webkit-color-swatch {
            border: 1px solid #506070;
            border-radius: 2px;
        }
        #${PREFIX}line-width {
            padding: 7px 5px;
            border-radius: 4px;
            border: 1px solid #1e2833;
            background-color: #2c3a47;
            color: #d0d8e0;
            font-size: 13px;
            box-shadow: inset 0 1px 0px rgba(255,255,255,0.05);
        }
        #${PREFIX}line-width option {
            background-color: #2c3a47;
            color: #d0d8e0;
        }

        .${PREFIX}canvas {
            position: fixed;
            top: 0;
            left: 0;
            z-index: 2147483645;
            pointer-events: none;
            transition: opacity 0.3s, visibility 0.3s;
        }
        .${PREFIX}canvas.${PREFIX}drawing-active { pointer-events: auto; }
        .${PREFIX}canvas.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .${PREFIX}text-input {
            position: fixed;
            z-index: 2147483647;
            background-color: white !important;
            border: 2px solid #6200d9 !important;
            border-radius: 4px !important;
            padding: 8px !important;
            font-size: 16px !important;
            color: #333 !important;
            min-width: 120px !important;
            max-width: 180px !important;
            width: auto !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
            outline: none !important;
            font-family: Arial, sans-serif !important;
            transition: border-color 0.2s !important;
            margin: 0 !important;
            line-height: 1.4 !important;
        }
        .${PREFIX}text-input:focus {
            border-color: #4800a0 !important;
            box-shadow: 0 2px 12px rgba(98, 0, 217, 0.4) !important;
        }
        
        .${PREFIX}modal-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2147483648;
        }
        
        .${PREFIX}modal-content {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            width: 90%;
            max-width: 500px;
        }
        
        .${PREFIX}modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .${PREFIX}modal-header h3 {
            margin: 0;
            font-size: 18px;
        }
        
        .${PREFIX}modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            margin: 0;
        }
        
        .${PREFIX}invite-url-container {
            display: flex;
            margin-bottom: 10px;
        }
        
        .${PREFIX}invite-url-input {
            flex-grow: 1;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px 0 0 4px;
        }
        
        .${PREFIX}invite-copy-button {
            padding: 8px 12px;
            background-color: #6200d9;
            color: white;
            border: none;
            border-radius: 0 4px 4px 0;
            cursor: pointer;
        }
        
        .${PREFIX}invite-copy-button:hover {
            background-color: #5000b0;
        }
        
        .${PREFIX}share-url-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .${PREFIX}share-url-container > div {
            display: flex;
            align-items: center;
        }
        
        .${PREFIX}share-resolution-info {
            font-size: 12px;
            color: #666;
            margin: 0 0 5px 0;
            text-align: center;
        }
        
        .${PREFIX}share-url-input {
            flex-grow: 1;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            margin-right: 8px;
        }
        
        .${PREFIX}share-copy-button {
            padding: 8px 12px;
            background-color: #6200d9;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            min-width: 60px;
        }
        
        .${PREFIX}share-copy-button:hover {
            background-color: #5000b0;
        }
        
        .${PREFIX}share-copy-button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        
        #${EXPORT_DIALOG_ID} {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 25px;
            z-index: 2147483647;
            box-shadow: 0 6px 12px rgba(0,0,0,0.15);
            text-align: center;
            font-family: Arial, sans-serif;
        }
        #${EXPORT_DIALOG_ID} h3 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #333;
        }
        #${EXPORT_DIALOG_ID} button {
            margin: 8px;
            padding: 10px 20px;
            cursor: pointer;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            transition: background-color 0.2s ease;
        }
        #${EXPORT_DIALOG_ID} button.dt-export-visible,
        #${EXPORT_DIALOG_ID} button.dt-export-full {
            background-color: #007bff;
            color: white;
        }
        #${EXPORT_DIALOG_ID} button.dt-export-visible:hover,
        #${EXPORT_DIALOG_ID} button.dt-export-full:hover {
            background-color: #0056b3;
        }
        #${EXPORT_DIALOG_ID} button.dt-export-cancel {
            background-color: #6c757d;
            color: white;
        }
        #${EXPORT_DIALOG_ID} button.dt-export-cancel:hover {
            background-color: #545b62;
        }
    `;
    document.head.appendChild(style);
    console.log('injectStyles.js: Styles injected into document head.');
})();