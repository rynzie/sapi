const imageInput = document.getElementById("imageUpload")
const webcamButton = document.getElementById("webcamButton")
const exitWebcamButton = document.getElementById("exitWebcamButton")
const webcam = document.getElementById("webcam")
const preview = document.getElementById("preview")
const result = document.getElementById("result")
const detectButton = document.getElementById("detectButton")

let base64Image = ""
let webcamStream = null
let detectionInterval = null

// Upload gambar
imageInput.addEventListener("change", function () {
  const file = this.files[0]
  resetHasil()

  if (file) {
    const reader = new FileReader()
    reader.onload = function (e) {
      base64Image = e.target.result.replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
      preview.src = e.target.result
      preview.style.display = "block"
      webcam.style.display = "none"
    }
    reader.readAsDataURL(file)
  }
})

// Tombol buka kamera belakang
webcamButton.addEventListener("click", async function () {
  resetHasil()

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }, // Kamera belakang
    })
    webcamStream = stream
    webcam.srcObject = stream

    webcam.style.display = "block"
    preview.style.display = "none"

    webcamButton.style.display = "none"
    exitWebcamButton.style.display = "inline-block"
    detectButton.style.display = "none"

    detectionInterval = setInterval(() => {
      ambilFrameDariKamera()
    }, 1000)
  } catch (err) {
    console.error("Tidak dapat mengakses kamera:", err)
    result.innerHTML = "Tidak dapat mengakses kamera."
  }
})

function ambilFrameDariKamera() {
  if (!webcam.videoWidth || !webcam.videoHeight) return

  const canvas = document.createElement("canvas")
  canvas.width = webcam.videoWidth
  canvas.height = webcam.videoHeight
  const ctx = canvas.getContext("2d")
  ctx.drawImage(webcam, 0, 0)

  base64Image = canvas.toDataURL("image/jpeg").replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
  kirimKeRoboflow()
}

// Tombol keluar kamera
exitWebcamButton.addEventListener("click", function () {
  stopWebcam()
  resetSemua()
})

function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach((track) => track.stop())
    webcamStream = null
  }
  if (detectionInterval) {
    clearInterval(detectionInterval)
    detectionInterval = null
  }
}

function resetSemua() {
  preview.src = ""
  preview.style.display = "block"
  webcam.style.display = "none"

  webcamButton.style.display = "inline-block"
  exitWebcamButton.style.display = "none"
  detectButton.style.display = "inline-block"

  imageInput.value = ""
  base64Image = ""
  resetHasil()
}

function resetHasil() {
  result.innerHTML = ""
}

function kirimKeRoboflow() {
  if (!base64Image) return

  fetch("https://detect.roboflow.com/male-cow-or-female-cow/1?api_key=Q0Ki6HgByuyWhNRKwMf7", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: base64Image,
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.predictions && data.predictions.length > 0) {
        const prediction = data.predictions[0]
        const className = prediction.class
        const confidence = (prediction.confidence * 100).toFixed(2)

        result.innerHTML = `
          Jenis kelamin: <strong>${className.toUpperCase()}</strong><br>
          Akurasi: ${confidence}%`
      } else {
        result.innerHTML = "Tidak dapat mengenali jenis kelamin sapi."
      }
    })
    .catch((err) => {
      console.error(err)
      result.innerHTML = "Terjadi kesalahan saat mendeteksi."
    })
}

detectButton.addEventListener("click", function () {
  if (webcam.style.display === "none" && !webcamStream) {
    kirimKeRoboflow()
  }
})
