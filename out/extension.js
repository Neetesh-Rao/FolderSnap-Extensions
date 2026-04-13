"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// 1. VS Code API import karo
const vscode = __importStar(require("vscode"));
// 2. Node.js built-in modules
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// 3. HTTP request aur file upload ke liye
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
// 4. Backend ka URL — Day 1 wala server
const BACKEND_URL = 'https://folder-snap-backend.onrender.com';
// 5. Extension activate hone pe yeh function call hoti hai
// VS Code extension load hone pe yahan se shuru hota hai sab
function activate(context) {
    console.log('FolderSnap extension active ho gayi');
    // 6. Command register karo — jo package.json mein define ki thi
    // Jab user Ctrl+Shift+P se "FolderSnap" dhundhe aur click kare
    // toh yeh function chalega
    const disposable = vscode.commands.registerCommand('foldersnap.createStructure', async () => {
        await runFolderSnap(context);
    });
    // 7. Extension ke saath command register karo
    // Kyun: jab extension deactivate ho toh command bhi saaf ho
    context.subscriptions.push(disposable);
}
// 8. Main function — sara logic yahan hai
async function runFolderSnap(context) {
    // 9. Pehle check karo — koi folder khula hai VS Code mein?
    // Bina workspace ke folders kahan banayenge?
    if (!vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('Pehle koi folder VS Code mein kholo!');
        return;
    }
    // 10. Current workspace ka path lo
    // Yahan pe folders banayenge hum
    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    // 11. User se image file choose karwao
    // VS Code ka built-in file picker khulega
    const imageUri = await vscode.window.showOpenDialog({
        canSelectFiles: true, // files select kar sakte hain
        canSelectFolders: false, // folders nahi
        canSelectMany: false, // ek hi image
        filters: {
            // Sirf yeh image types allow karo
            'Images': ['png', 'jpg', 'jpeg', 'webp']
        },
        title: 'Folder Structure ki Photo Select Karo'
    });
    // 12. Agar user ne cancel kiya — kuch mat karo
    if (!imageUri || imageUri.length === 0) {
        return;
    }
    // 13. Selected image ka path lo
    const imagePath = imageUri[0].fsPath;
    // 14. User ko progress dikhao — loading indicator
    // Kyun: Gemini API call mein 5-10 second lagte hain
    //       User ko lagta hai kuch ho raha hai
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'FolderSnap',
        cancellable: false
    }, async (progress) => {
        // 15. Step 1 — Image backend pe bhej rahe hain
        progress.report({ message: 'Image analyze ho rahi hai...' });
        try {
            // 16. FormData banao — image file bhejne ke liye
            // Jaise browser mein form submit karte hain file ke saath
            const formData = new form_data_1.default();
            // 17. Image file FormData mein daalo
            // 'image' key wahi hai jo backend multer expect karta hai
            formData.append('image', fs.createReadStream(imagePath));
            // 18. Backend pe POST request bhejo
            const response = await axios_1.default.post(`${BACKEND_URL}/analyze`, formData, {
                headers: {
                    // FormData ke headers automatically set honge
                    ...formData.getHeaders()
                },
                // 30 second timeout — agar backend respond nahi kiya
                timeout: 30000
            });
            // 19. Backend se structure aaya — Step 2 shuru
            progress.report({ message: 'Folders ban rahe hain...' });
            // 20. Structure ka data lo
            const structure = response.data.structure;
            // 21. Recursively folders aur files banao
            // Yeh function andar se call hota rehta hai
            // jab tak poori structure na ban jaaye
            createFolderStructure(structure, workspacePath);
            // 22. Success message dikhao
            vscode.window.showInformationMessage('✅ Folder structure ban gayi! FolderSnap ne kaam kar diya.');
            // 23. VS Code Explorer refresh karo
            // Bina refresh ke naye folders nahi dikhenge
            await vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
        }
        catch (error) {
            // 24. Error handling
            console.error('FolderSnap Error:', error);
            // 25. User ko samjhane wali error dikhao
            if (error.code === 'ECONNREFUSED') {
                // Backend server chal nahi raha
                vscode.window.showErrorMessage('❌ Backend server nahi mila. node index.js chalao pehle!');
            }
            else if (error.response?.status === 500) {
                // Gemini API ya processing error
                vscode.window.showErrorMessage('❌ Image analyze nahi ho payi. Clear photo use karo.');
            }
            else {
                // Koi aur error
                vscode.window.showErrorMessage(`❌ Error: ${error.message}`);
            }
        }
    });
}
// 26. Recursive function — folders aur files banata hai
// structure = Gemini ka JSON
// basePath  = kahan banana hai (workspace folder)
function createFolderStructure(structure, basePath) {
    // 27. Structure ke har item pe loop karo
    for (const [name, value] of Object.entries(structure)) {
        // 28. Is item ka full path banao
        const fullPath = path.join(basePath, name);
        if (value === null) {
            // 29. null matlab — yeh FILE hai
            // File banao — empty file
            // flag 'a' matlab agar already hai toh touch karo sirf
            fs.writeFileSync(fullPath, '', { flag: 'a' });
        }
        else if (typeof value === 'object') {
            // 30. Object matlab — yeh FOLDER hai
            // 31. Folder banao agar pehle se nahi hai
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                // recursive: true matlab parent folders bhi banao
                // jaise a/b/c — a aur b bhi ban jaayenge
            }
            // 32. Is folder ke andar bhi structure ho sakti hai
            // Toh recursively call karo same function
            // Jab tak poori nesting complete na ho
            createFolderStructure(value, fullPath);
        }
    }
}
// 33. Extension deactivate hone pe — cleanup
// VS Code band hone pe ya extension disable hone pe
function deactivate() {
    console.log('FolderSnap deactivate ho gayi');
}
