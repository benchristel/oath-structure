angular.module('OathStructure').controller('QueueController', ['$anchorScroll','$location', '$timeout','$scope','Deejay', '$http', 'YoutubeService', function ($anchorScroll, $location, $timeout, $scope, Deejay, $http, YoutubeService) {
  $scope.queue = []
  $scope.shuffled = false;
  $scope.repeatQueue = false;
  $scope.normalQueue = []
  // $scope.shuffledQueue = []

  $scope.shuffle = function(){
    if ($scope.shuffled){
      $scope.queue = $scope.normalQueue
      $scope.shuffled = false
    }else{
      $scope.shuffled = true
      $scope.normalQueue = $scope.queue
      $scope.queue = _.shuffle($scope.queue)
    }
  }

  $scope.savingPlaylist = function(){
    message.send('saving-playlist', $scope.queue)
  }

  $scope.gotoAnchor = function(x) {
    $timeout(function() {
      console.log("Called with index: "+ x)
      var newHash = 'anchor' + x;
      $location.hash('anchor' + x);
      $anchorScroll();
    })
  }

  $scope.$on('$locationChangeStart', function(ev, next, last, newState) {
    console.log(ev)
    console.log(next)
    console.log(last)
    console.log(newState)
    if (next != last){
      ev.preventDefault();

    }
  });

  $scope.repeat = function(){
    if($scope.repeatQueue){
      $scope.repeatQueue = false
    } else{
      $scope.repeatQueue = true
    }
  }

  $scope.show = 'video'

  $scope.albumArt = function() {
    var song = songAt(currentlyPlayingIndex())
    if (song && !song.albumArtUrl){
      return song ? song.youtubeImageId : null
    }else{
      if (song){
        return song.albumArtUrl
      }
    }
  }

  $scope.importLibrary = function(){
    message.send("import-library")
  }

  $scope.jumpTo = function(song) {
    var currentlyPlaying = currentlyPlayingIndex()
    if (currentlyPlaying !== null) {
      songAt(currentlyPlaying).playing = false
    }
    song.playing = true
    Deejay.fromTheTop(song)
  }

  $scope.remove = function(song) {
    if (song.playing) {
      playNextSong()
    }
    if ($scope.shuffled){
      $scope.normalQueue =_($scope.normalQueue).without(song)
    }
    $scope.queue = _($scope.queue).without(song)
  }

  $scope.removeAll = function(){
    if ($scope.shuffled){
      $scope.normalQueue = []
    }
    $scope.queue = []
    Deejay.goOffAir()
  }

  message.on('deejay-updated', function(deejay) {
    if (deejay.needsSong()) {
      console.log("Deejay needs a song for some reason. Playing next one")
      playNextSong()
    }
  })

  function playNextSong() {
    var newSong = advance()
    if (newSong) {
      Deejay.fromTheTop(newSong)
    } else {
      console.log("Went off air for some reason")
      Deejay.goOffAir()
    }
  }

  $scope.deleteSelected = function(){
    if ($scope.shuffled){
      $scope.normalQueue = _.reject($scope.queue, function(song){ return song.selected })
    }
    $scope.queue = _.reject($scope.queue, function(song){ return song.selected })
    if (currentlyPlayingIndex() === null){
      Deejay.goOffAir()
    }
  }

  message.on('back', function(){
    if (Deejay.currentPlaybackPosition() > 3){
      Deejay.fromTheTop(Deejay.getCurrentSong())
    }else{
      var currentIndex = currentlyPlayingIndex()
      if (currentIndex == 0){
        Deejay.fromTheTop(songAt(0))
      }else{
        Deejay.fromTheTop(songAt(currentIndex-1))
        songAt(currentIndex).playing = false
        songAt(currentIndex-1).playing = true
        $scope.gotoAnchor(currentlyPlayingIndex())
      }
    }
  })

  message.on('play-now', function(list){
    var currentlyPlaying = currentlyPlayingIndex()
    var index = currentlyPlaying == null ? 0 : currentlyPlaying+1

    $scope.queue.splice.apply($scope.queue, [index, 0].concat(list));

    if ($scope.shuffled){
      $scope.normalQueue.splice.apply($scope.normalQueue, [$scope.normalQueue.length, 0].concat(list));
    }

    playNextSong()
  })

  message.on('add-to-queue', function(song) {
    if ($scope.shuffled){
      $scope.normalQueue.push(song)
      var currentlyPlaying = currentlyPlayingIndex()
      // if (currentlyPlaying == $scope.queue.length-1){
      //   $scope.queue.push(song)
      // }else{
      var index = _.random(currentlyPlaying+1, $scope.queue.length)
      $scope.queue.splice(index, 0, song)
      // }

    }else{
      console.log($scope.queue.length-1)
      $scope.queue.push(song)
      $scope.gotoAnchor($scope.queue.length-1)
    }
  })

  message.on('deejay-updated', function(deejay) {
    var current = songAt(currentlyPlayingIndex())

    if (current && deejay.isOffAir()) {
      current.playing = false
    }
  })

  // $scope.savePlaylist = function(name){
  //   var playlists_json = localStorage.getItem("playlists")
  //   if (playlists_json == null){
  //     playlists_json == "[]"
  //   }
  //   var playlists = JSON.parse(playlists_json)
  //   localStorage.setItem("playlists", JSON.stringify(playlists.append()))
  //   localStorage.setItem(name, JSON.stringify($scope.queue))
  // }

  window.onbeforeunload = function(event){
    localStorage.setItem("queue", JSON.stringify($scope.queue))
  }

  window.onload = function() {
    $timeout(function() {
        Deejay.setCurrentSong(current())
    }, 0)
  }

  var isTheQueue = JSON.parse(localStorage.getItem("queue"))

  if (isTheQueue !== null){
    $scope.queue = isTheQueue
  }


  function current() {
    return songAt(currentlyPlayingIndex())
  }

  function advance() {
    var currentlyPlaying = currentlyPlayingIndex()

    if (currentlyPlaying === null && indexInQueue(0)) {
      songAt(0).playing = true
      $scope.gotoAnchor(0)
      return songAt(0)
    }

    if (currentlyPlaying !== null) {
      songAt(currentlyPlaying).playing = false
    }

    if (indexInQueue(currentlyPlaying + 1)) {
      songAt(currentlyPlaying + 1).playing = true
    }else if ($scope.repeatQueue) {
      songAt(0).playing = true
      $scope.gotoAnchor(0)
      return songAt(0)
    }
    $scope.gotoAnchor(currentlyPlayingIndex())

    return songAt(currentlyPlayingIndex())
  }

  function indexInQueue(i) {
    return i < $scope.queue.length && i >= 0
  }

  function songAt(index) {
    return $scope.queue[index]
  }

  function currentlyPlayingIndex() {
    for (var i = 0; i < $scope.queue.length; i++) {
      if ($scope.queue[i].playing) {
        return i
      }
    }
    return null
  }
}])
