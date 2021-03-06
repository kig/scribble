Brush = Klass({
  diameter : 1,
  left : -0.5,
  top : -0.5,
  right : 0.5,
  bottom : 0.5,

  initialize : function() {},
  drawLine : function(ctx, color, composite, x1, y1, r1, x2, y2, r2) {},
  drawPoint : function(ctx, color, composite, x, y, r) {
    this.drawLine(ctx, color, composite, x,y,r, x,y,r);
  },

  copy : function(){
    return Object.extend({}, this);
  },

  brushPath : function(ctx, scale, transform) {
    ctx.arc(0,0,scale,0,Math.PI*2,true);
  }
});

PolygonBrush = Klass(Brush, {

  stipple : false,

  initialize : function(path) {
    this.path = path;
    var u = this.path[0];
    var minX = u.x, maxX = u.x, minY = u.y, maxY = u.y;
    for (var i=1; i<this.path.length; i++) {
      var u = this.path[i];
      if (u.x < minX) minX = u.x;
      else if (u.x > maxX) maxX = u.x;
      if (u.y < minY) minY = u.y;
      else if (u.y > maxY) maxY = u.y;
    }
    this.left = minX;
    this.top = minY;
    this.right = maxX;
    this.bottom = maxY;
    var dx = maxX-minX, dy = maxY-minY;
    this.diameter = Math.sqrt(dx*dx + dy*dy);
  },

  brushPath : function(ctx, scale, transform) {
    var path = this.getTransformedPath(transform);
    var u = path[0];
    ctx.moveTo(u.x*scale, u.y*scale);
    for (var i=1; i<path.length; i++) {
      var u = path[i];
      ctx.lineTo(u.x*scale, u.y*scale);
    }
    ctx.closePath();
  },

  getTransformedPath : function(transform) {
    var t = transform;
    var path = this.path.map(function(p) {
      return {
        x: p.x * t[0] + p.y * t[1],
        y: p.x * t[2] + p.y * t[3]
      };
    });
    return path;
  },

  drawPoint : function(ctx, color, composite, x, y, r, transform) {
    ctx.beginPath();
    var t = transform;
    ctx.subPolygon(this.ccwSort(this.path.map(function(p){
      var px = p.x * t[0] + p.y * t[1];
      var py = p.x * t[2] + p.y * t[3];
      return {x: px*r+x, y: py*r+y};
    })));
    ctx.fill(color, composite);
  },

  ccwSort : function(points) {
    var cx=0,cy=0;
    for (var i=0; i<points.length; i++) {
      var p = points[i];
      cx += p.x;
      cy += p.y;
    }
    cx /= points.length;
    cy /= points.length;
    for (var i=0; i<points.length; i++) {
      var p = points[i];
      p.a = Math.atan2(p.y-cy, p.x-cx);
    }
    points.sort(function(a,b) {
      return a.a - b.a;
    });
    return points;
  },

  // draw brush at each endpoint
  // for each brush path segment, draw a quad from
  // one endpoint to the other
  drawLine : function(ctx, color, composite, x1, y1, r1, x2, y2, r2, transform) {
    if (this.stipple) {
      this.drawPoint(ctx, color, composite, x2, y2, r2, transform);
      return;
    }
    ctx.beginPath();
    var path = this.ccwSort(this.getTransformedPath(transform));
    ctx.subPolygon(path.map(function(p){
      return {x: p.x*Math.max(0.1,r1-0.5)+x1, y: p.y*Math.max(0.1,r1-0.5)+y1};
    }));
    ctx.subPolygon(path.map(function(p){
      return {x: p.x*Math.max(0.1,r2-0.5)+x2, y: p.y*Math.max(0.1,r2-0.5)+y2};
    }));
    var u = path[path.length-1];
    var v = path[0];
    ctx.subPolygon(this.ccwSort([
      {x:x1+u.x*r1, y:y1+u.y*r1},
      {x:x1+v.x*r1, y:y1+v.y*r1},
      {x:x2+v.x*r2, y:y2+v.y*r2},
      {x:x2+u.x*r2, y:y2+u.y*r2}
    ]));
    for (var i=1; i<path.length; i++) {
      var u = path[i-1];
      var v = path[i];
      ctx.subPolygon(this.ccwSort([
        {x:x1+u.x*r1, y:y1+u.y*r1},
        {x:x1+v.x*r1, y:y1+v.y*r1},
        {x:x2+v.x*r2, y:y2+v.y*r2},
        {x:x2+u.x*r2, y:y2+u.y*r2}
      ]));
    }
    ctx.fill(color, composite);
  },

  drawQuadratic : function(ctx, color, composite, x1, y1, r1, cx, cy, cr, x2, y2, r2, transform) {
    if (this.stipple) {
      this.drawPoint(ctx, color, composite, x2, y2, r2, transform);
      return;
    }
    ctx.beginPath();
    var path = this.ccwSort(this.getTransformedPath(transform));
    ctx.subPolygon(path.map(function(p){
      return {x: p.x*Math.max(0.1,r1-0.5)+x1, y: p.y*Math.max(0.1,r1-0.5)+y1};
    }));
    ctx.subPolygon(path.map(function(p){
      return {x: p.x*Math.max(0.1,r2-0.5)+x2, y: p.y*Math.max(0.1,r2-0.5)+y2};
    }));
    var u = path[path.length-1];
    var v = path[0];
    ctx.subQuadratic(this.ccwSort([
      {x:x1+u.x*r1, y:y1+u.y*r1, cx:cx+u.x*cr, cy:cy+u.y*cr},
      {x:x1+v.x*r1, y:y1+v.y*r1, cx:cx+v.x*cr, cy:cy+v.y*cr},
      {x:x2+v.x*r2, y:y2+v.y*r2, cx:cx+v.x*cr, cy:cy+v.y*cr},
      {x:x2+u.x*r2, y:y2+u.y*r2, cx:cx+u.x*cr, cy:cy+u.y*cr}
    ]));
    for (var i=1; i<path.length; i++) {
      var u = path[i-1];
      var v = path[i];
      ctx.subQuadratic(this.ccwSort([
        {x:x1+u.x*r1, y:y1+u.y*r1, cx:cx+u.x*cr, cy:cy+u.y*cr},
        {x:x1+v.x*r1, y:y1+v.y*r1, cx:cx+v.x*cr, cy:cy+v.y*cr},
        {x:x2+v.x*r2, y:y2+v.y*r2, cx:cx+v.x*cr, cy:cy+v.y*cr},
        {x:x2+u.x*r2, y:y2+u.y*r2, cx:cx+u.x*cr, cy:cy+u.y*cr}
      ]));
    }
    ctx.fill(color, composite);
  }
});


RoundBrush = Klass(Brush, {
  drawPoint : function(ctx, color, composite, x1, y1, r1) {
    ctx.drawArc(x1, y1, r1, 0, Math.PI*2, color, composite);
  },

  drawLine : function(ctx, color, composite, x1, y1, r1, x2, y2, r2) {
    ctx.beginPath();
    ctx.subArc(x1, y1, (Math.max(0.1,r1-0.5)), 0, Math.PI*2);
    ctx.subArc(x2, y2, (Math.max(0.1,r2-0.5)), 0, Math.PI*2);
    var a = Math.atan2(y2-y1, x2-x1);
    var dx = x2-x1, dy = y2-y1;
    var d = Math.sqrt(dx*dx + dy*dy);
    if (d > 0) {
      var ada = Math.asin(Math.abs(r2-r1) / d);
      if (r1 > r2) ada = -ada;
      var da = Math.PI*0.5 + ada;
      var cosp = Math.cos(a+da), cosm = Math.cos(a-da);
      var sinp = Math.sin(a+da), sinm = Math.sin(a-da);
      var points = [
        {x: cosp*r1+x1, y: sinp*r1+y1},
        {x: x1, y: y1},
        {x: cosm*r1+x1, y: sinm*r1+y1},
        {x: cosm*r2+x2, y: sinm*r2+y2},
        {x: x2, y: y2},
        {x: cosp*r2+x2, y: sinp*r2+y2}
      ];
      ctx.subPolygon(points);
    }
    ctx.fill(color, composite);
  },

  drawQuadratic : function(ctx, color, composite, x1, y1, r1, cx, cy, cr, x2, y2, r2) {
    ctx.beginPath();
    ctx.subArc(x1, y1, (Math.max(0.1,r1-0.25)), 0, Math.PI*2);
    ctx.subArc(x2, y2, (Math.max(0.1,r2-0.25)), 0, Math.PI*2);
    var a = Math.atan2(y2-y1, x2-x1);
    var dx = x2-x1, dy = y2-y1;
    var d = Math.sqrt(dx*dx + dy*dy);
    var ada = Math.asin(Math.abs(r2-r1) / d);
    if (r1 > r2) ada = -ada;
    var da = Math.PI*0.5 + ada;
    var cosp = Math.cos(a+da), cosm = Math.cos(a-da);
    var sinp = Math.sin(a+da), sinm = Math.sin(a-da);
    var points = [
      {x: cosp*r1+x1, y: sinp*r1+y1, cx: x1, cy: y1},
      {x: x1, y: y1, cx: x1, cy: y1},
      {x: cosm*r1+x1, y: sinm*r1+y1, cx: x1, cy: y1},
      {x: cosm*r2+x2, y: sinm*r2+y2, cx: cosm*cr+cx, cy: sinm*cr+cy},
      {x: x2, y: y2, cx: x2, cy: y2},
      {x: cosp*r2+x2, y: sinp*r2+y2, cx: x2, cy: y2},
      {x: cosp*r1+x1, y: sinp*r1+y1, cx: cosp*cr+cx, cy: sinp*cr+cy}
    ];
    ctx.subQuadratic(points);
    ctx.fill(color, composite);
  }
});


ImageBrush = Klass(Brush, {

  spacing : 0.2,

  initialize : function(image, spacing) {
    this.image = image;
    if (spacing)
      this.setSpacing(spacing);
  },

  setSpacing : function(spacing) {
    if (spacing <= 0)
      throw (new Error("ImageBrush.setSpacing: bad spacing "+spacing));
    this.spacing = spacing;
  },

  // draw brush image every spacing*image.radius
  drawLine : function(ctx, color, composite, x1, y1, r1, x2, y2, r2) {
    var dx = x2-x1;
    var dy = y2-y1;
    var d = Math.sqrt(dx*dx+dy*dy);
    var i = 0;
    var iw = this.image.width;
    var ih = this.image.height;
    var max = Math.max(iw,ih);
    while (i<=d) {
      var f = i/d;
      var r = r1*(1-f) + r2*f;
      var x = x1*(1-f) + x2*f;
      var y = y1*(1-f) + y2*f;
      var s = r / max;
      var w = w*s, h = h*s;
      ctx.drawImage(this.image, x-w/2, y-h/2, w, h, composite);
      i += Math.max(0.5, this.spacing * r);
    }
  }
});
