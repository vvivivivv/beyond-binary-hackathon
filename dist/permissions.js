
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('requestBtn');
    const status = document.getElementById('status');

    btn.addEventListener('click', async () => {
        console.log("Attempting to trigger mic popup...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            console.log("SUCCESS: Stream obtained");

            stream.getTracks().forEach(track => track.stop());
            
            btn.style.display = 'none';
            status.style.display = 'block';
            
            alert("SUCCESS! Microphone access granted. You can now use voice commands in the side panel.");
            
            setTimeout(() => window.close(), 1000);
        } catch (err) {
            console.error("PERMISSIONS ERROR:", err.name, err.message);
            
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert("Chrome blocked the request. \n\nPlease click the 'Lock' or 'Tune' icon in the address bar (left side) and toggle Microphone to ON.");
            } else {
                alert("Error: " + err.message);
            }
        }
    });
});