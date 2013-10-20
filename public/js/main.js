var downloadURL = function downloadURL(url) {
  var hiddenIFrameID = 'hiddenDownloader',
    iframe = document.getElementById(hiddenIFrameID);
  if (iframe === null) {
    iframe = document.createElement('iframe');
    iframe.id = hiddenIFrameID;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }
  iframe.src = url;
};

$(function(){
  var socket = io.connect('/');

  socket.on('connect', function(){
    var delivery = new Delivery(socket);

    delivery.on('receive.start',function(fileUID){
      console.log('receiving a file!');
    });

    delivery.on('receive.success',function(file){
      console.log(file);
      downloadURL(file.dataURL());
    });
  });
});