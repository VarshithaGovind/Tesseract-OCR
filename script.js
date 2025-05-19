let audioInstance; // To manage the audio instance
let cachedAudioUrl = null; // To store the generated audio URL
let isAudioPaused = false; // Flag to track if the audio is paused

document.getElementById("upload-form").addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission

    const fileInput = document.getElementById("file-input");
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const response = await fetch("/extract-text", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Failed to extract text");
        }

        const data = await response.json();
        document.getElementById("text-area").value = data.text;

        // Preload the audio for TTS
        preloadAudio(data.text);

        // Start 3D animation with characters having different voices
        start3DAnimation(data.text);

    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while extracting text.");
    }
});

async function preloadAudio(text) {
    if (!text) return;

    try {
        // Show loading indicator
        document.getElementById("loading-indicator").style.display = "block";

        const response = await fetch("/text-to-speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            throw new Error("Failed to generate speech");
        }

        const blob = await response.blob(); // Get the audio file as a blob
        cachedAudioUrl = URL.createObjectURL(blob); // Cache the audio URL

    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while generating speech.");
    } finally {
        // Hide loading indicator
        document.getElementById("loading-indicator").style.display = "none";
    }
}

document.getElementById("play-btn").addEventListener("click", () => {
    if (!cachedAudioUrl) {
        alert("Audio is not ready yet. Please try again in a moment.");
        return;
    }

    if (audioInstance) {
        audioInstance.pause(); // Stop any previously playing audio
    }

    audioInstance = new Audio(cachedAudioUrl); // Use cached audio URL
    audioInstance.play();

    // Synchronize 3D animation with speech
    synchronize3DAnimation();

    // Hide the continue button while audio is playing
    document.getElementById("continue-btn").style.display = "inline-block";
    isAudioPaused = false; // Reset the pause flag
});

document.getElementById("stop-btn").addEventListener("click", () => {
    if (audioInstance) {
        audioInstance.pause(); // Pause the audio
    }

    // Show the continue button to allow resuming from the point where it was paused
    document.getElementById("continue-btn").style.display = "inline-block";
    isAudioPaused = true; // Set the pause flag
});

document.getElementById("continue-btn").addEventListener("click", () => {
    if (audioInstance && isAudioPaused) {
        audioInstance.play(); // Continue from where it was paused
        isAudioPaused = false; // Reset the pause flag
    }
});

// 3D Animation Code with Character Voices
function start3DAnimation(text) {
    const container = document.getElementById("animation-container");

    // Clear any existing animation
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Create a Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(renderer.domElement);

    // Add a light source
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(10, 10, 10);
    scene.add(light);

    // Create 3D characters (you can replace this with actual character models)
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
        const textGeometry = new THREE.TextGeometry(text.slice(0, 100), {
            font: font,
            size: 0.5,
            height: 0.1,
        });

        const textMaterial = new THREE.MeshPhongMaterial({ color: 0xff5733 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        textMesh.position.set(-5, 0, -10); // Adjust position
        scene.add(textMesh);

        // Animation loop for 3D rotation
        const animate = () => {
            requestAnimationFrame(animate);
            textMesh.rotation.y += 0.01; // Rotate the text
            renderer.render(scene, camera);
        };

        animate();
    });

    // Set the camera position
    camera.position.z = 5;
    
    // Trigger character animations with different voices
    triggerCharacterVoices();
}

function triggerCharacterVoices() {
    // Split the text into sentences or characters
    const sentences = ["Hello, I am character 1.", "Now, character 2 speaks.", "Character 3 will speak next."];

    // Create a speech synthesis instance for each character
    const synth = window.speechSynthesis;

    // Assign a unique voice for each character (this could be set dynamically based on the content)
    const voices = synth.getVoices();
    
    const characterVoices = [
        voices[0], // Character 1 voice
        voices[1], // Character 2 voice
        voices[2]  // Character 3 voice
    ];

    // Iterate through sentences and assign voices to characters
    sentences.forEach((sentence, index) => {
        let utterance = new SpeechSynthesisUtterance(sentence);
        utterance.voice = characterVoices[index]; // Assign voice
        utterance.onend = () => {
            console.log(`Character ${index + 1} finished speaking.`);
        };
        synth.speak(utterance);
    });
}

function synchronize3DAnimation() {
    // Example: You can update text or visuals based on audio playtime
    if (audioInstance) {
        audioInstance.ontimeupdate = () => {
            // You can synchronize 3D animation or perform actions based on audio progress
            console.log(`Audio current time: ${audioInstance.currentTime}`);
        };
    }
}
