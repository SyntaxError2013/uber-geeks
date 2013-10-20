var socket = io.connect("/");
socket.on('hello', function (data) {
  console.log(data);
});
$('.filetr').on('click', function () {
  $(this).addClass('active');
  var id = $(this).attr("fid");
  $('#broadcast').show();
  $('#broadcast').attr('fid', id);
});
$('#broadcast').on('click', function () {
  var file = $(this).attr("fid");
  console.log(file);
  socket.emit('broadcast', {fileid: file});
});
socket.on('newfile', function (data) {
  var file = data.filedata[0];
  $('.notification').show();
  $('.notification').html('User ' + data.username.username + ' sent you the file <a href="/file/' + file.fid + '">' + file.filename + '</a>') ;
});
$(document).on('keyup', function (e) {
  var key = e.which;
  if(key==13 && $('#q').val()!='') {
    $('#searchform').submit();
  }
});