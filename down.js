document.getElementById("downloadPDF").addEventListener("click", function () {
  const { jsPDF } = window.jspdf
  const doc = new jsPDF()

  const detailText = document.getElementById("printDetail").innerText
  const imgElement = document.getElementById("printImage")

  if (imgElement.src) {
    const imgData = imgElement.src
    const imgWidth = 180
    const imgHeight = 120
    doc.addImage(imgData, "JPEG", 15, 20, imgWidth, imgHeight)
  }

  doc.setFontSize(12)
  doc.text("Hasil Deteksi:", 15, 150)
  const splitDetail = doc.splitTextToSize(detailText, 180)
  doc.text(splitDetail, 15, 160)

  const fileName = "hasil_deteksi_" + new Date().toISOString().slice(0, 19).replace(/:/g, "-") + ".pdf"
  doc.save(fileName)
})

document.getElementById("downloadIMG").addEventListener("click", function () {
  const printArea = document.getElementById("printArea")

  html2canvas(printArea, {
    scale: 2,
    useCORS: true,
  }).then((canvas) => {
    const link = document.createElement("a")
    link.download = "hasil_deteksi_" + new Date().toISOString().slice(0, 19).replace(/:/g, "-") + ".png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  })
})
