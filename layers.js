Layer = Klass({
  display : true,
  opacity : 1,
  zIndex : 0,

  initialize : function(){},

  copy : function() {
    var l = Object.extend({}, this);
    this.copyProperties(l);
    return l;
  },

  copyProperties : function(tgt) {
  },

  flip : function() {},

  applyTo : function(ctx, w, h){
    if (this.display) {
      ctx.save();
        ctx.globalAlpha = this.opacity;
        this.compositeTo(ctx, w, h);
      ctx.restore();
    }
  },

  show : function(){
    this.display = true;
  },

  hide : function(){
    this.display = false;
  },

  clear : function(){},

  drawPolygon : function(path, color) {},

  drawArc : function(x,y,r,a1,a2, color, lineWidth, stroke, closed) {}
    
});


CanvasLayer = Klass(Layer, {
  initialize : function(){
    this.canvas = E.canvas(window.innerWidth,window.innerHeight);
    this.ctx = this.canvas.getContext('2d');
  },

  copyProperties : function(tgt) {
    tgt.canvas = E.canvas(this.canvas.width, this.canvas.height);
    tgt.ctx = tgt.canvas.getContext('2d');
    tgt.ctx.globalCompositeOperation = 'copy';
    tgt.ctx.drawImage(this.canvas, 0, 0);
    tgt.ctx.globalCompositeOperation = 'source-over';
  },

  compositeTo : function(ctx, w, h) {
    ctx.drawImage(this.canvas, 0, 0);
  },
  
  drawPolygon : function(path, color) {
    var ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (var i=1; i<path.length; i++) {
      var u = path[i];
      ctx.lineTo(u.x, u.y);
    }
    ctx.fill();
  },

  drawArc : function(x,y,r,a1,a2, color, lineWidth, stroke, closed) {
    var ctx = this.ctx;
    if (stroke) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
    } else {
      ctx.fillStyle = color;
    }
    ctx.beginPath();
    ctx.arc(x,y,r,a1,a2);
    if (closed)
      ctx.closePath();
    if (stroke)
      ctx.stroke();
    else
      ctx.fill();
  },
  
  flip : function() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'copy';
    this.ctx.translate(this.canvas.width,0);
    this.ctx.scale(-1,1);
    this.ctx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.restore();
  },

  clear : function() {
    this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
  }
});


ColorLayer = Klass(Layer, {
  initialize : function(color){
    this.color = (color != null ? color : [0,0,0,1]);
  },

  copyProperties : function(tgt) {
    tgt.color = this.color.slice(0);
  },

  compositeTo : function(ctx, w, h) {
    ctx.fillStyle = ColorUtils.colorToStyle(this.color);
    ctx.fillRect(0,0,w,h);
  }
});

TiledLayer = Klass(Layer, {

  tileSize: 64,

  initialize: function() {
    this.tiles = {};
  },

  drawImage: function(img, x, y) {
    x += 0x8000, y += 0x8000;
    var tx = Math.floor(x / this.tileSize);
    var ty = Math.floor(y / this.tileSize);
    var ltx = Math.floor((x+img.width) / this.tileSize);
    var lty = Math.floor((y+img.height) / this.tileSize);
    var ox = x - tx*this.tileSize;
    var oy = y - ty*this.tileSize;
    while (tx <= ltx) {
      while (ty <= lty) {
        // optimize: skip if img is transparent here
        this.getTileCtx(tx,ty).drawImage(img,ox,oy);
        ty++;
        oy -= this.tileSize;
      }
      tx++;
      ox -= this.tileSize;
    }
  },

  getTileCtx : function(x,y) {
    if (y<0 || x<0 || y>0xffff || x>0xffff)
      throw('bad coords');
    var p=x+y*0x10000;
    var t=this.tiles;
    var c=t[p];
    if (c == null || c.snapshotted) {
      c = E.canvas(this.tileSize, this.tileSize);
      if (t[p].snapshotted) {
        var ctx = c.getContext('2d');
        ctx.globalCompositeOperation = 'copy';
        ctx.drawImage(t[p],0,0);
        ctx.globalCompositeOperation = 'source-over';
      }
      t[p] = c;
    }
    return c.getContext('2d');
  },

  clear : function(){
    this.tiles = {};
  },

  composite : function(ctx) {
    for (var f in this.tiles) {
      var x = f & 0xffff;
      var y = f >> 16;
      ctx.drawImage(this.tiles[f], x, y);
    }
  },

  drawPolygon : function(path, color) {
    var hitTiles = [];
    var minX,maxX,minY,maxY;
    minX = maxX = path[0].x;
    minY = maxY = path[0].y;
    for (var i=1; i<path.length; i++) {
      var p = path[i];
      if (p.x < minX) minX = p.x;
      else if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      else if (p.y > maxY) maxY = p.y;
    }
    var fx = Math.floor(minX/this.tileSize);
    var fy = Math.floor(minY/this.tileSize);
    var lx = Math.floor(maxX/this.tileSize);
    var ly = Math.floor(maxY/this.tileSize);
    for (var tx=fx; tx <= lx; tx++)
      for (var ty=fy; ty <= ly; ty++)
        hitTiles.push({x:tx, y:ty});
    for (var j=0; j<hitTiles.length; j++) {
      var tile = hitTiles[j];
      var ctx = this.getTileCtx(tile.x, tile.y);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (var i=1; i<path.length; i++) {
        var u = path[i];
        ctx.lineTo(u.x, u.y);
      }
      ctx.fill();
    }
  },

  drawArc : function(x,y,r,a1,a2, color, lineWidth, stroke, closed) {
    var hitTiles = [];
    var fx = Math.floor((x-r)/this.tileSize);
    var fy = Math.floor((y-r)/this.tileSize);
    var lx = Math.floor((x+r)/this.tileSize);
    var ly = Math.floor((y+r)/this.tileSize);
    for (var tx=fx; tx <= lx; tx++)
      for (var ty=fy; ty <= ly; ty++)
        hitTiles.push({x:tx, y:ty});
    for (var j=0; j<hitTiles.length; j++) {
      var tile = hitTiles[j];
      var ctx = this.getTileCtx(tile.x, tile.y);
      if (stroke) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
      } else {
        ctx.fillStyle = color;
      }
      ctx.beginPath();
      ctx.arc(x,y,r,a1,a2);
      if (closed)
        ctx.closePath();
      if (stroke)
        ctx.stroke();
      else
        ctx.fill();
    }
  }
  
});

