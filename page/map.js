/**
* Class to work with OS Timemap.js and Vis timeline. 
* It allows initialization of mapping and timeline controls and fills data for these controls
* 
* @param _map - id of map element container 
* @param _timeline - id of timeline element
* @param _basePath - need to specify path to timemap assets (images)
* #param mylayout - layout object that contains map and timeline
* @returns {Object}
* @see editing_input.js
* 
* @package     Heurist academic knowledge management system
* @link        http://HeuristNetwork.org
* @copyright   (C) 2005-2015 University of Sydney
* @author      Artem Osmakov   <artem.osmakov@sydney.edu.au>
* @license     http://www.gnu.org/licenses/gpl-3.0.txt GNU License 3.0
* @version     4.0
*/

/*
* Licensed under the GNU License, Version 3.0 (the "License"); you may not use this file except in compliance
* with the License. You may obtain a copy of the License at http://www.gnu.org/licenses/gpl-3.0.txt
* Unless required by applicable law or agreed to in writing, software distributed under the License is
* distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied
* See the License for the specific language governing permissions and limitations under the License.
*/


function hMapping(_map, _timeline, _basePath, _mylayout) {
    var _className = "Mapping",
    _version   = "0.4";

    var mapdiv_id = null,
    timelinediv_id = null,
    
    basePath = '', //@todo remove
    
    all_mapdata = {}, // array of all datasets
    selection = [],   // array of selected record ids
    mylayout,         // layout object that contains map and timeline 
    _curr_layout = null; // keep current layout sets to avoid redundant update

    var tmap = null,  // timemap object
    vis_timeline = null, // vis timeline object
    drawingManager,     //manager to draw the selection rectnagle
    lastSelectionShape,  

    defaultZoom = 2,
    keepMinDate = null,
    keepMaxDate = null,
    keepMinMaxDate = true,
    
    _onSelectEventListener,
    
    // TimeMap theme
    customTheme = new TimeMapTheme({
            "color": "#0000FF",  //for lines and polygones
            "lineColor": "#0000FF",
            "icon": basePath + "assets/star-red.png",
            "iconSize": [25,25],
            "iconShadow": null,
            "iconAnchor":[9,17]
    });


    /**
    * Initialization
    */
    function _init(_map, _timeline, _basePath, _mylayout) {
        mapdiv_id = _map;
        timelinediv_id = _timeline;
        basePath = _basePath; //redundant
        mylayout = _mylayout;

        /*if(_mapdata){
        _load(_mapdata);
        }*/
    }
    
    function _isEmptyDataset(_mapdata){
        return (top.HEURIST4.util.isnull(_mapdata) ||  (_mapdata['mapenabled']==0 && _mapdata['timeenabled']==0));
    }
    
    /**
    * show/hide panels map and timeline
    */
    function _updateLayout(){
        
        var ismap = false, istime = false;
        
        
        $.each(all_mapdata, function(dataset_id, _mapdata){
            
            ismap = ismap || (_mapdata.mapenabled>0);
            istime = istime || (_mapdata.timeenabled>0);
            
            return !(ismap && istime);
            
        });
        
        /*
        if(!(ismap || istime)) { //empty
               return false;
        }else if(!ismap){ 
            //always show the map - since map content can be loaded by selection of map document

            $(".ui-layout-north").hide();
            $(".ui-layout-center").hide();
            $(".ui-layout-resizer-south").hide();
            $(".ui-layout-south").show();
            $(".ui-layout-south").css({'width':'100%','height':'100%'});
            //mylayout.hide('center');
            
            
            //mylayout.changeOption('center','minSize',0);
            //$(".ui-layout-resizer-south").css('height',0);
            //mylayout.sizePane('south','100%');
        }*/
        var new_layout = ((ismap?'1':'0') + (istime?'1':'0'));

        if(_curr_layout != new_layout){
        
            //mylayout.changeOption('center','minSize',300);
            //$(".ui-layout-resizer-south").css('height',7);
            
            var tha = $('#mapping').height(); 
            var th = Math.floor(tha*0.2);
            th = th>200?200:th;

            $(".ui-layout-north").show();
            $(".ui-layout-center").show();
            $(".ui-layout-resizer-south").show();
            $(".ui-layout-south").css({'height':th+'px'});
            
            if(!istime){
                mylayout.hide('south');
            }else {
                mylayout.show('south', true);   
                if(ismap){
                    mylayout.sizePane('south', th);
                }else{
                    mylayout.sizePane('south', tha-40);
                }
            }
            if(ismap || !istime){
               $('#map_empty_message').hide();
               $('#map').show();
            }else{
               $('#map').hide();
               $('#map_empty_message').show();
            }
            
            _curr_layout = new_layout;
        }    
        return true;
        
    }
    
    /**
    * Load timemap datasets 
    * @see hRecordSet.toTimemap()
    * 
    * @param _mapdata
    */
    function _addDataset(_mapdata){
        
        var res = false;
        
        if(!top.HEURIST4.util.isnull(_mapdata)){
        
            var dataset_id = _mapdata.id;
            
            top.HEURIST4._time_debug = new Date().getTime() / 1000;
            
            if(_isEmptyDataset(_mapdata)){ //show/hide panels
            
                _deleteDataset( dataset_id );
            
            }else{
                
                all_mapdata[dataset_id] = _mapdata;  //keep
                
                _updateLayout();   //show hide panels
                
console.log('add dataset '+ ( new Date().getTime() / 1000 - top.HEURIST4._time_debug) );
console.log('map: '+_mapdata.mapenabled+'  time:'+_mapdata.timeenabled);
                top.HEURIST4._time_debug = new Date().getTime() / 1000;
                                        
                _reloadDataset( dataset_id );
                    

console.log('ADDED '+ ( new Date().getTime() / 1000 - top.HEURIST4._time_debug) );
                top.HEURIST4._time_debug = new Date().getTime() / 1000;
                
                
                res = true;
            }
            
            //reload timeline content    
            _loadVisTimeline();

console.log('TIMELINE ADDED '+ ( new Date().getTime() / 1000 - top.HEURIST4._time_debug) );
                top.HEURIST4._time_debug = new Date().getTime() / 1000;

            
        }
        return res;
    }

    //
    //
    //
    function _getDataset( dataset_id ){                
        return all_mapdata[dataset_id];
    }
    
    function _changeDatasetColor( dataset_id, new_color, updateOnMap ){                
            
            var mapdata = _getDataset( dataset_id ); 
            
            if(mapdata['color']!=new_color){
               
                for (var i=0; i<mapdata.options.items.length; i++){
                    mapdata.options.items[i].options.icon =  
                        top.HAPI4.iconBaseURL + mapdata.options.items[i].options.iconId + 'm.png&color='+new_color;
                        
                    mapdata.options.items[i].options.color = new_color;
                    mapdata.options.items[i].options.lineColor = new_color;
                    mapdata.options.items[i].options.fillColor = new_color;
                        
                }
                
                mapdata['color'] = new_color;
                
                if(updateOnMap){
                    _reloadDataset(dataset_id);
                }
            }    
    }
    
    //
    //
    //
    function _reloadDataset(dataset_id){
        
                var dataset = tmap.datasets[dataset_id];
                
                var mapdata = _getDataset(dataset_id);

                /*var datasetTheme = new TimeMapTheme({ 
                    color: mapdata['color'],
                    lineColor: mapdata['color'],
                    fillColor: mapdata['color']
                });*/
                
                if(!dataset){ //already exists with such name
                    dataset = tmap.createDataset(dataset_id);
                    //dataset.opts.theme = datasetTheme;
                }else{
                    dataset.clear();
                    //dataset.changeTheme(datasetTheme)
                }
                
                dataset.loadItems(mapdata.options.items);
                dataset.each(function(item){
                    item.opts.openInfoWindow = _onItemSelection;  //event listener on marker selection
                });
                
                dataset.hide();
                dataset.show();
    }
      
    //
    //
    //  
    function _deleteDataset(dataset_id){
        
            // remove from map
            var dataset = tmap.datasets[dataset_id];
            if(dataset){
                 tmap.deleteDataset(dataset_id);
            }
            
            var mapdata = _getDataset(dataset_id);
            
            //remove from storage and reload timeline
            if(mapdata){
                       
                     var was_timeenabled = (mapdata.timeenabled>0);   
                
                     delete all_mapdata[dataset_id];
                     //all_mapdata[dataset_id] = undefined;
                     
                     if(was_timeenabled){
                         //reload timeline
                         _loadVisTimeline();
                     }
                     
                     _updateLayout();
            }   
    }
    
    //
    //
    //
    function _showDataset(dataset_id, is_show){
        var dataset = tmap.datasets[dataset_id];
        if(dataset){
            if(is_show){
                tmap.showDataset(dataset_id);
            }else{
                tmap.hideDataset(dataset_id);
            }
        }
        var mapdata = _getDataset(dataset_id);
        mapdata.visible = is_show;
        //remove from storage and reload timeline
        if(mapdata && mapdata.timeenabled>0){
            _loadVisTimeline();             
        }
    }
    
    // get unix timestamp from vis
    function _getUnixTs(item, field, ds){

        var item_id = 0;
        if(item && item['id']){
            item_id = item['id'];
        }else{
            item_id = item;
        }
        if(item_id){
            
            if(!ds) ds = vis_timeline.itemsData;

            var type = {};
            type[field] = 'Moment';
            var val = ds.get(item_id,{fields: [field], type: type });            
            
            if(val!=null && val[field] && val[field]._isAMomentObject){
                //return val[field].toDate().getTime(); //unix
                return val[field].unix()*1000;
            }
        }
        return NaN;
    }
    
    //called once on first timeline load
    // it inits buttons on timeline toolbar
    //
    function _initVisTimelineToolbar(){
        
        /**
         * Zoom the timeline a given percentage in or out
         * @param {Number} percentage   For example 0.1 (zoom out) or -0.1 (zoom in)
         */
        function __timelineZoom (percentage) {
            var range = vis_timeline.getWindow();
            var interval = range.end - range.start;
           
            vis_timeline.setWindow({
                start: range.start.valueOf() - interval * percentage,
                end:   range.end.valueOf()   + interval * percentage
            });

    //console.log('set2: '+(new Date(range.start.valueOf() - interval * percentage))+' '+(new Date(range.end.valueOf()   + interval * percentage)));        
        }  
        
        function __timelineGetEnd(ds){

            if(!ds) ds = vis_timeline.itemsData;
            
            var item1 = ds.max('end');
            var item2 = ds.max('start');
            var end1 = _getUnixTs(item1, 'end', ds);
            var end2 = _getUnixTs(item2, 'start', ds);
                
            return isNaN(end1)?end2:Math.max(end1, end2);
        }
        
        function __timelineZoomAll(ds){
            
            if(!ds){
                vis_timeline.fit(); //short way
                return;
            }
            
            if(!ds) ds = vis_timeline.itemsData;
            
            //moment = timeline.itemsData.get(item['id'],{fields: ['start'], type: { start: 'Moment' }});        
            var start = _getUnixTs(ds.min('start'), 'start', ds);
            var end = __timelineGetEnd(ds);
            
            var interval = (end - start);
            
            if(isNaN(end) || end-start<1000){
                interval = 1000*60*60*24; //one day            
                end = start;
            }else{
                interval = interval*0.2;
            }
            
            vis_timeline.setWindow({
                start: start - interval,
                end: end + interval
            });        
        }

        function __timelineZoomSelection(){
            
            var sels = vis_timeline.getSelection();
            if(sels && sels['length']>0){
                   //vis_timeline.focus(sels); //short way - not work proprely
                   //return;
                
                   var ds = new vis.DataSet(vis_timeline.itemsData.get(sels));
                   __timelineZoomAll(ds);
            }
            
        }
        
        function __timelineMoveTo(dest){

            var start = _getUnixTs(vis_timeline.itemsData.min('start'), 'start');
            var end = __timelineGetEnd();
            
            var time = (dest=='end') ?end:start;
            
            var range = vis_timeline.getWindow();
            var interval = range.end - range.start;
            
            var delta = interval*0.05;

            if(isNaN(end) || end-start<1000){//single date

                interval = interval/2;
                
                vis_timeline.setWindow({
                    start: start - interval,
                    end:   start + interval
                });
                
            }else if(dest=='end'){
                vis_timeline.setWindow({
                    start: time + delta - interval,
                    end:   time + delta
                });
            }else{
                vis_timeline.setWindow({
                    start: time - delta,
                    end:   time - delta + interval
                });
            }
        }
        function __timelineShowLabels(){
            if($("#btn_timeline_labels").is(':checked')){
                $(".vis-item-content").find("span").show();
            }else{
                $(".vis-item-content").find("span").hide();
            }
        }
        
        var toolbar = $("#timeline_toolbar").zIndex(3).css('font-size','0.8em');

        $("<button>").button({icons: {
            primary: "ui-icon-circle-plus"
            },text:false, label:top.HR("Zoom In")})
            .click(function(){ __timelineZoom(-0.25); })
            .appendTo(toolbar);
        $("<button>").button({icons: {
            primary: "ui-icon-circle-minus"
            },text:false, label:top.HR("Zoom Out")})
            .click(function(){ __timelineZoom(0.5); })
            .appendTo(toolbar);
        $("<button>").button({icons: {
            primary: "ui-icon-arrowthick-2-e-w"
            },text:false, label:top.HR("Zoom to All")})
            .click(function(){ __timelineZoomAll(); })
            .appendTo(toolbar);
        $("<button>").button({icons: {
            primary: "ui-icon-arrowthickstop-1-s"
            },text:false, label:top.HR("Zoom to selection")})
            .click(function(){ __timelineZoomSelection(); })
            .appendTo(toolbar);
        $("<button>").button({icons: {
            primary: "ui-icon-arrowthickstop-1-w"
            },text:false, label:top.HR("Move to Start")})
            .click(function(){ __timelineMoveTo("start"); })
            .appendTo(toolbar);
        $("<button>").button({icons: {
            primary: "ui-icon-arrowthickstop-1-e"
            },text:false, label:top.HR("Move to End")})
            .click(function(){ __timelineMoveTo("end"); })
            .appendTo(toolbar);
            
            
            
        var menu_label_settings = $('<ul id="vis_timeline_toolbar"><li id="tlm0"><a href="#"><span/>Full label</a></li>'
                        +'<li id="tlm1"><a href="#"><span/>Truncate to bar</a></li>'
                        +'<li id="tlm2"><a href="#"><span class="ui-icon ui-icon-check"/>Fixed length</a></li>'
                        +'<li id="tlm3"><a href="#"><span/>Hide labels</a></li>'
                        +'<li id="tlm4"><a href="#"><span/>Hide labels/No stack</a></li></ul>') 
        .zIndex(9999)
        .addClass('menu-or-popup')
        .css({'position':   'absolute', 'padding':'2px'})
        .appendTo( $('body') )
        .menu({
            select: function( event, ui ) {
                
                var contents = $(".vis-item-content");
                var spinner = $("#timeline_spinner");
                
                menu_label_settings.find('span').removeClass('ui-icon ui-icon-check');
                ui.item.find('span').addClass('ui-icon ui-icon-check');
                
                var mode =  Number(ui.item.attr('id').substr(3));
                
                if(mode==0){
                    $.each(contents, function(i,item){item.style.width = 'auto';});//.css({'width':''});                    
                }else if(mode==2){
                    contents.css({'width': spinner.spinner('value')+'em'});                    
                }
                
                $('div .vis-item-overflow').css('overflow',(mode===1)?'hidden':'visible');
                
                //'label_in_bar':(mode==1), 
                vis_timeline.setOptions({'margin':1,  'stack':(mode!=4)});
                
                if(mode==2){
                    spinner.show();
                }else{
                    spinner.hide();
                }
                
                if(mode>=3){
                    contents.find("span").hide();
                }else{
                    contents.find("span").show();
                }

                vis_timeline.redraw();

                
        }})
        .hide();
            
        $("<button>").button({icons: {
            primary: "ui-icon-tag",
            secondary: "ui-icon-triangle-1-s"            
            },text:false, label:top.HR("Label settings")})
            .click(function(){  
                $('.menu-or-popup').hide(); //hide other

                var menu = $( menu_label_settings )
                .show()
                .position({my: "right top", at: "right bottom", of: this });
                $( document ).one( "click", function() { menu.hide(); });
                return false;
                
            })
            .appendTo(toolbar);
            
        var spinner = $( "<input>", {id:"timeline_spinner", value:10} ).appendTo(toolbar);
        $("#timeline_spinner").spinner({
              value: 10,  
              spin: function( event, ui ) {
                if ( ui.value > 100 ) {
                  $( this ).spinner( "value", 100 );
                  return false;
                } else if ( ui.value < 5 ) {
                  $( this ).spinner( "value", 5 );
                  return false;
                } else {
                    $(".vis-item-content").css({'width': ui.value+'em'});                    
                    
                }
              }
            }).css('width','2em');//rre.hide();            
            
        /*   
        $("<input id='btn_timeline_labels' type='checkbox' checked>").appendTo(toolbar);
        $("<label for='btn_timeline_labels'>Show labels2</label>").appendTo(toolbar);
        $("#btn_timeline_labels").button({icons: {
            primary: "ui-icon-tag"
            },text:false, label:top.HR("Show labels")})
            .click(function(){ __timelineShowLabels(); })
            .appendTo(toolbar);
        */
        
    }
    
    //init visjs timeline
    function _loadVisTimeline(){
              
        var timeline_data = [],
            timeline_groups = [];
        
        $.each(all_mapdata, function(dataset_id, mapdata){
            
            if(mapdata.visible && mapdata.timeline.items.length>0){

                timeline_data = timeline_data.concat( mapdata.timeline.items );
                timeline_groups.push({ id:dataset_id, content: mapdata.title});
                
            }
        });      
                
        if(timeline_data){
            
        var groups = new vis.DataSet( timeline_groups );
        var items = new vis.DataSet( timeline_data ); //options.items );
        
        var is_stack = true;//(timeline_groups.length<2 && timeline_data.length<250);
        
 console.log('TIMELINE DATASET '+ ( new Date().getTime() / 1000 - top.HEURIST4._time_debug) );
                top.HEURIST4._time_debug = new Date().getTime() / 1000;
       
        
        if(vis_timeline==null){
            var ele = document.getElementById(timelinediv_id);
            // Configuration for the Timeline
            var options = {dataAttributes: ['id'], 
                           orientation:'both', //scale on top and bottom
                           selectable:true, multiselect:true, 
                           zoomMax:31536000000*500000,
                           stack:is_stack,
                           margin:1,
                           minHeight: $(ele).height(),
                           order: function(a, b){
                               return a.start<b.start?-1:1;
                           }
                           };
                        //31536000000 - year
            // Create a Timeline
            vis_timeline = new vis.Timeline(ele, null, options);        
            //on select listener
            vis_timeline.on('select', function(params){
                selection = params.items;
                if(selection && selection.length>0){
                    
                    var e = params.event;
                                                //div.vis-item.vis-dot.vis-selected.vis-readonly
                    e.cancelBubble = true;
                    if (e.stopPropagation) e.stopPropagation();
                    e.preventDefault();
                    if($(e.target).hasClass('vis-item vis-dot vis-selected')) return;
                    
                    //remove dataset prefixes
                    $.each(selection,function(idx, itemid){
                        var k = itemid.indexOf('-');
                        if(k>0)
                            selection[idx] = itemid.substring(k+1);
                    });

                    $( document ).bubble( "option", "content", "" );
                    _showSelection(true, true); //show selction on map
                    _onSelectEventListener.call(that, selection); //trigger global selection event
                }
            });
            
            //init timeline toolbar
            _initVisTimelineToolbar();
            
        }else{
            //vis_timeline.setOptions({'stack':is_stack});            
        }
            
        vis_timeline.setGroups(groups);
        vis_timeline.setItems(items);            
        vis_timeline.fit(); //short way

        if(!is_stack){
            $(".vis-item-content").find("span").hide();
            //$.find('#vis_timeline_toolbar li').removeClass('ui-icon-check');
            //$.find('#vis_timeline_toolbar li #tlm4').addClass('ui-icon-check');
        }
        
        //$(".vis-item-content").css('margin-left',0);
        
        //if(_mapdata.timeenabled>0)
        //    vis_timeline.setVisibleChartRange(_mapdata.timeline.start, _mapdata.timeline.end);
        }
    }
    

    function _load(_mapdata, _selection, __startup_mapdocument, __onSelectEventListener, _callback){
        
            function __onDataLoaded(_tmap){  //this function is called only once after map initialization
                tmap = _tmap;

//console.log('after map init');                    
                    
                    //first map initialization
                var nativemap = tmap.getNativeMap();
                
//console.log('is native map '+top.HEURIST4.util.isnull(nativemap)); 
                
                google.maps.event.addListenerOnce(nativemap, 'tilesloaded', function(){

//console.log('tileloaded 1');                    
                    /*this part runs when the mapobject is created and rendered
                    google.maps.event.addListenerOnce(nativemap, 'tilesloaded', function(){
                        //this part runs when the mapobject shown for the first time
console.log('tileloaded 2');                    
                    });*/
                
//console.log('after map init DELAYED');                    

                    // Add controls if the map is not initialized yet
                    var mapOptions = {
                        panControl: true,
                        zoomControl: true,
                        mapTypeControl: true,
                        scaleControl: true,     
                        overviewMapControl: true,
                        rotateControl: true,
                        scrollwheel: true,
                        mapTypeControlOptions: {
                            mapTypeIds: ["terrain","roadmap","hybrid","satellite","tile"]
                        }
                    };

                    var nativemap = tmap.getNativeMap();
                    nativemap.setOptions(mapOptions);
                    
                    //return;
                    
                    //_initDrawListeners();
                    
                    if(false && dataset.mapenabled>0){
                        tmap.datasets.main.hide();
                        tmap.datasets.main.show();
                    }else if (!__startup_mapdocument) { //zoom to whole world
                        var swBound = new google.maps.LatLng(-40, -120);
                        var neBound = new google.maps.LatLng(70, 120);
                        var bounds = new google.maps.LatLngBounds(swBound, neBound); 
                        nativemap.fitBounds(bounds);
                    } 

                    // loading the list of map documents  see map_overlay.js
                    that.map_control = new hMappingControls(that, __startup_mapdocument);

                    $("#map-settingup-message").hide();
                    $(".map-inited").show();
                
                    if(_callback){
                        _callback.call();
                    }else{ //not used - to remove
                        
                        //ART 20151026  _updateLayout();
                        //highlight selection
                        //ART 20151026  _showSelection(false);
                    }
                    
                    console.log('MAP INIT COMPLETED');                    
                    
                });          
                
       }// __onDataLoaded       
        
        //asign 2 global for mapping - on select listener and startup map document
        if(__onSelectEventListener) _onSelectEventListener = __onSelectEventListener;
        
        //_mapdata = _mapdata || [];
        selection = _selection || [];
        
        //timemap is already inited
        if(that.map_control!=null){ 
            
                $( document ).bubble('closeAll');  //close all popups      
                
                if(__startup_mapdocument>0) 
                    that.map_control.loadMapDocumentById(__startup_mapdocument);    //see map_overlay.js
        
                if(_callback){
                    _callback.call();
                }else{
                    //ART 20151026  _updateLayout();
                    //highlight selection
                    _showSelection(false);
                }
            
        }else{
        
            // add fake/empty datasets for further use in mapdocument (it is not possible to add datasets dynamically)
            if(!_mapdata){
                _mapdata = [{id: "main", type: "basic", options: { items: [] }}];
            }
            
            // Initialize TimeMap
            tmap = TimeMap.init({
                mapId: mapdiv_id, // Id of gmap div element (required)
                timelineId: null, //timelinediv_id, // Id of timeline div element (required)
                datasets: _mapdata, 
                
                options: {
                    mapZoom: defaultZoom,
                    theme: customTheme,
                    eventIconPath: top.HAPI4.iconBaseURL //basePath + "ext/timemap.js/2.0.1/images/"
                }
                , dataLoadedFunction: __onDataLoaded
                }, tmap);
                
                    
        }
            
    }
    
    //
    // adds draw button and init them for google map DrawingManager
    //
    function _initDrawListeners(){
        
            var shift_draw = false;
        
            //addd drawing manager to draw rectangle selection tool
            var shapeOptions = {
                strokeWeight: 1,
                strokeOpacity: 1,
                fillOpacity: 0.2,
                editable: false,
                clickable: false,
                strokeColor: '#3399FF',
                fillColor: '#3399FF'
            };            
            
            drawingManager = new google.maps.drawing.DrawingManager({
                drawingMode: null,
                drawingControlOptions: {
                    position: google.maps.ControlPosition.TOP_RIGHT, //LEFT_BOTTOM,    
                    drawingModes: [google.maps.drawing.OverlayType.POLYGON, google.maps.drawing.OverlayType.RECTANGLE]
                },
                rectangleOptions: shapeOptions,
                polygonOptions: shapeOptions,
                map: tmap.getNativeMap()
            });            
            
            google.maps.event.addListener(drawingManager, 'overlaycomplete', function(e) {
                
                //clear previous
                if (lastSelectionShape != undefined) {
                    lastSelectionShape.setMap(null);
                }

                // cancel drawing mode
                if (shift_draw == false) { drawingManager.setDrawingMode(null); }

                lastSelectionShape = e.overlay;
                lastSelectionShape.type = e.type;

                _selectItemsInShape();
                
                /*if (lastSelectionShape.type == google.maps.drawing.OverlayType.RECTANGLE) {

                    lastBounds = lastSelectionShape.getBounds();

                    //$('#bounds').html(lastBounds.toString());

                    //_mapdata.options.items[0].options.recid
                    //_mapdata.options.items[3].placemarks[0].polyline .lat .lon
                    
                    
                    //new google.maps.LatLng(25.774252, -80.190262),
                    
                    
                    // determine if marker1 is inside bounds:
                    if (lastBounds.contains(m1.getPosition())) {
                        //$('#inside').html('Yup!');
                    } else {
                        //$('#inside').html('Nope...');
                    }

                } else if (lastSelectionShape.type == google.maps.drawing.OverlayType.POLYGON) {

                    //$('#bounds').html('N/A');

                    // determine if marker is inside the polygon:
                    // (refer to: https://developers.google.com/maps/documentation/javascript/reference#poly)
                    if (google.maps.geometry.poly.containsLocation(m1.getPosition(), lastSelectionShape)) {
                        //$('#inside').html('Yup!');
                    } else {
                        //$('#inside').html('Nope...');
                    }

                }*/

            });

            /*var shift_draw = false;

            $(document).bind('keydown', function(e) {
            if(e.keyCode==16 && shift_draw == false){
            map.setOptions({draggable: false, disableDoubleClickZoom: true});
            shift_draw = true; // enable drawing
            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
            }

            });

            $(document).bind('keyup', function(e) {
            if(e.keyCode==16){
            map.setOptions({draggable: true, disableDoubleClickZoom: true});
            shift_draw = false // disable drawing
            drawingManager.setDrawingMode(null);
            }

            });*/

            //clear rectangle on any click or drag on the map
            google.maps.event.addListener(map, 'mousedown', function () {
                if (lastSelectionShape != undefined) {
                    lastSelectionShape.setMap(null);
                }
            });

            google.maps.event.addListener(map, 'drag', function () {
                if (lastSelectionShape != undefined) {
                    lastSelectionShape.setMap(null);
                }
            });
            
            //define custom tooltips
            
            $(tmap.getNativeMap().getDiv()).one('mouseover','img[src="https://maps.gstatic.com/mapfiles/drawing.png"]',function(e){

                $(e.delegateTarget).find('img[src="https://maps.gstatic.com/mapfiles/drawing.png"]').each(function(){
                  $(this).closest('div[title]').attr('title',function(){
                     switch(this.title){
                      case 'Stop drawing':
                        return 'Drag the map or select / get information about an object on the map';
                          break;
                      case 'Draw a rectangle':
                        return 'Select objects within a rectangle. Hold down Ctrl to add to current selection';
                          break;
                      case 'Draw a shape':
                        return 'Select objects within a polygon - double click to finish the polygon';
                          break;
                      default:return this.title;  
                     } 

                  });
                });
              });            
            
            
            
        
    }
    
    function _selectItemsInShape(){
        
        selection = [];
        
        var isRect = (lastSelectionShape.type == google.maps.drawing.OverlayType.RECTANGLE);
        var lastBounds, i;
        if(isRect){
            lastBounds = lastSelectionShape.getBounds();
        }
        
        var dataset = tmap.datasets.main;  //take main dataset
            dataset.each(function(item){ //loop trough all items
                   
                        if(item.placemark){
                            var isOK = false;
                            if(item.placemark.points){ //polygone or polyline
                                for(i=0; i<item.placemark.points.length; i++){
                                    var pnt = item.placemark.points[i];
                                    var pos = new google.maps.LatLng(pnt.lat, pnt.lon);
                                    if(isRect){
                                        isOK = lastBounds.contains( pos );
                                    }else{
                                        isOK = google.maps.geometry.poly.containsLocation(pos, lastSelectionShape);
                                    }
                                    if(isOK) break;
                                }

                            }else{
                                var pos = item.getNativePlacemark().getPosition();
                                if(isRect){
                                    isOK = lastBounds.contains( pos );
                                }else{
                                    isOK = google.maps.geometry.poly.containsLocation(pos, lastSelectionShape);
                                }

                            }
                            if(isOK){
                                selection.push(item.opts.recid);    
                            }


                        }
            });
            
            
        //reset and highlight selection
        _showSelection(true);
        //trigger selection - to highlight on other widgets
        _onSelectEventListener.call(that, selection);
    }
  


    //    
    // Add clicked marker to array of selected
    //
    // (timemap)item.opts.openInfoWindow -> _onItemSelection  -> _showSelection (highlight marker) -> _showPopupInfo
    //
    function _onItemSelection(  ){
        //that - hMapping
        //this - item (map item)
        
        selection = [this.opts.recid];
        _showSelection(true);
        //trigger global selection event - to highlight on other widgets
        _onSelectEventListener.call(that, selection);  
        //TimeMapItem.openInfoWindowBasic.call(this);        
    }
    
    //
    // highlight markers and show bubble
    // 
    //  item.opts.openInfoWindow -> _onItemSelection  -> _showSelection -> _showPopupInfo
    //
    // isreset - true - remove previous selection
    //
    function _showSelection( isreset, fromtimeline ){

            //select items on timeline
            if(!fromtimeline && vis_timeline){

                var selection_vis = [];
                
                $.each(all_mapdata, function(dataset_id, _mapdata){
                   if(_mapdata.timeenabled>0) {
                        $.each(_mapdata.timeline.items, function(idx, titem){
                           if(selection.indexOf(titem.recID)>=0){
                                selection_vis.push( titem.id );
                           }
                        });
                   }
                });
                vis_timeline.setSelection( selection_vis );
            }
            
            if(selection && selection.length>0){
                
                var lastRecID = selection[selection.length-1];
                var lastSelectedItem = null;
                
                tmap.each(function(dataset){   
                    dataset.each(function(item){ //loop trough all items

                        if(lastRecID==item.opts.recid){
                            lastSelectedItem = item; 
                            return false;
                        }
                    });
                    if(lastSelectedItem != null) return false;
                });
                
                //find selected item in the dataset
                if(lastSelectedItem)
                    _showPopupInfo.call(lastSelectedItem);
            }
    }

    //
    // old version with highlight on map - need to implement in different way
    //
    function _showSelection_old( isreset ){

        var lastSelectedItem = null;
        var items_to_update = [];       //current item to be deleted
        var items_to_update_data = [];  // items to be added (replacement for previous)
        //var dataset = tmap.datasets.main;  //take main dataset
        
        if ( isreset || (selection && selection.length>0) ){
            
            var lastRecID = (selection)?selection[selection.length-1]:-1;
            
            tmap.each(function(dataset){   
            
                dataset.each(function(item){ //loop trough all items

                    if(item.opts.places && item.opts.places.length>0){
                
                        var idx = selection ?selection.indexOf(item.opts.recid) :-1;
                        
                        var itemdata = {
                        datasetid: dataset.id,
                        title: ''+item.opts.title,
                        start: item.opts.start,
                        end: item.opts.end,
                        placemarks: item.opts.places,
                        options:item.opts
                          /*{
                            description: item.opts.description,
                            //url: (record.url ? "'"+record.url+"' target='_blank'"  :"'javascript:void(0);'"), //for timemap popup
                            //link: record.url,  //for timeline popup
                            recid: item.opts.recid,
                            rectype: item.opts.rectype,
                            title: (item.opts.title+'+'),
                            //thumb: record.thumb_url,
                            eventIconImage: item.opts.rectype + '.png',
                            icon: top.HAPI4.iconBaseURL + item.opts.rectype + '.png',

                            start: item.opts.start,
                            end: item.opts.end,
                            places: item.opts.places
                            //,infoHTML: (infoHTML || ''),
                                }*/
                            };
                        
                        
                        if(idx>=0){ //this item is selected
                            
                            items_to_update.push(item);
                            
                            //was itemdata  
                            itemdata.options.eventIconImage = item.opts.iconId + 's.png';   //it will have selected record (blue bg)
                            itemdata.options.icon = top.HAPI4.iconBaseURL + itemdata.options.eventIconImage;
                            itemdata.options.color = "#FF0000";
                            itemdata.options.lineColor = "#FF0000";

                            items_to_update_data.push(itemdata);
                            
                            //if(idx == selection.length-1) lastSelectedItem = item;
                            
                        }else{ //clear selection
                            //item.opts.theme
                            //item.changeTheme(customTheme, true); - dont work
                            var usual_icon = item.opts.iconId + 'm.png'; //it will have usual gray bg
                            if(usual_icon != itemdata.options.eventIconImage){

                                items_to_update.push(item);
                                
                                //was itemdata
                                itemdata.options.eventIconImage = usual_icon;
                                itemdata.options.icon = top.HAPI4.iconBaseURL + itemdata.options.eventIconImage;
                                itemdata.options.color = "#0000FF";
                                itemdata.options.lineColor = "#0000FF";
                                
                                items_to_update_data.push(itemdata);
                            }
                        }   
                        
                    }//has places
                    else{
                        //for vis timline only
                        if(lastRecID==item.opts.recid){
                            lastSelectedItem = item;
                        }
                    }             
                });
            });   
            /*
            if(items_to_update_data.length>0){
                dataset.clear();
                dataset.hide();
                dataset.loadItems(items_to_update_data);
                dataset.show();
            }     */
           
            
            if(items_to_update.length>0) {
                
                var tlband0 = $("#"+timelinediv_id).find("#timeline-band-0");
                var keep_height = (tlband0.length>0)?tlband0.height():0;
                
                //dataset.hide();
                
                var newitem,i,affected_datasets = [];
                for (i=0;i<items_to_update.length;i++){
                        //items_to_update[i].clear();
                        var ds_id = items_to_update_data[i].datasetid;
                        
                        var dataset = tmap.datasets[ ds_id ];
                        
                        dataset.deleteItem(items_to_update[i]);
                        
                        //dataset.items.push(items_to_update[i]);
                        newitem = dataset.loadItem(items_to_update_data[i]);
                        
                        //art 020215 
                        newitem.opts.openInfoWindow = _onItemSelection;
                        
                        if(lastRecID==newitem.opts.recid){
                            lastSelectedItem = newitem;
                        }
                        
                        if(affected_datasets.indexOf(ds_id)<0){
                            affected_datasets.push(ds_id);
                        }
                }
                //dataset.show();
                
                //hide and show the affected datasets - to apply changes
                for (i=0;i<affected_datasets.length;i++){
                    var dataset = tmap.datasets[ affected_datasets[i] ];
                    if(dataset.visible){
                        dataset.hide();
                        dataset.show();
                    }
                }
                
                //_zoomTimeLineToAll(); //
                //tmap.timeline.layout();
                if(tlband0.length>0)
                    tlband0.css('height', keep_height+'px');
            }
           
            //item.timeline.layout();
            
            //select items on timeline
            if(vis_timeline){
                vis_timeline.setSelection( selection );
            }
            
        }
        
        /*var lastRecID = (selection)?selection[selection.length-1]:-1;
        // loop through all items - change openInfoWindow
        if(items_to_update.length>0 || !isreset){
            var k = 0;
            dataset.each(function(item){
                item.opts.openInfoWindow = _onItemSelection;
                //item.showPlacemark();
                if(lastRecID==item.opts.recid){
                        lastSelectedItem = item;
                }
            });
        }*/
        
        if(lastSelectedItem){
            _showPopupInfo.call(lastSelectedItem);
            //TimeMapItem.openInfoWindowBasic.call(lastSelectedItem);
            //lastSelectedItem.openInfoWindow();
        }
    }
    
    //
    //  item.opts.openInfoWindow -> _onItemSelection  -> _showSelection -> _showPopupInfo
    //
    function _showPopupInfo(){
        
            //close others bubbles
            $( document ).bubble( "closeAll" );
                    
        
            var item = this,
                html = item.getInfoHtml(),
                ds = item.dataset,
                placemark = item.placemark,
                show_bubble_on_map = false;
                                                              //text-align:right;
            show_bubble_on_map = (item.getType() != "" && placemark.api!=null);
            var bubble_header = '<div style="width:99%;'+(show_bubble_on_map?'':'padding-right:10px;')+'">'
            var ed_html =  '';
            var popupURL = null;
                
            if(!top.HEURIST4.util.isnull(item.opts.info)){
                
                if(!item.opts.info){
                    return;   //supress popup
                }else if(item.opts.info.indexOf('http://')==0){
                    popupURL =  item.opts.info; //load content from url
                }else{
                    html =  bubble_header + item.opts.info + '</div>'; //predefined content
                }
                
            }else{
                //compose content of popup dynamically
                
                var recID       = item.opts.recid,
                    rectypeID   = item.opts.rectype,
                    bkm_ID      = item.opts.bkmid,
                    recTitle    = top.HEURIST4.util.htmlEscape(item.opts.title),                                              
                    startDate   = item.opts.start,
                    endDate     = item.opts.end,
                    description = top.HEURIST4.util.htmlEscape(item.opts.description),
                    recURL      = item.opts.URL,
                    html_thumb  = item.opts.thumb || '';

                ed_html = bubble_header                
            +   '<div style="display:inline-block;">'
            +     '<img src="'+top.HAPI4.basePath+'assets/16x16.gif'+'" class="rt-icon" style="background-image: url(&quot;'+top.HAPI4.iconBaseURL + rectypeID+'.png&quot;);">'
            +     '<img src="'+top.HAPI4.basePath+'assets/13x13.gif" class="'+(bkm_ID?'bookmarked':'unbookmarked')+'">'                
            +   '</div>'
            +  ((top.HAPI4.currentUser.ugr_ID>0)?
                '<div title="Click to edit record" style="float:right;height:16px;width:16px;" id="btnEditRecordFromBubble" >'
              /*  '<div title="Click to edit record" style="float:right;height:16px;width:16px;" id="btnEditRecordFromBubble" '
            + 'class="logged-in-only ui-button ui-widget ui-state-default ui-corner-all ui-button-icon-only" role="button" aria-disabled="false">'
            //+ ' onclick={event.preventDefault(); window.open("'+(top.HAPI4.basePathOld+'edit/editRecord.html?db='+top.HAPI4.database+'&recID='+recID)+'", "_new");} >'
            +     '<span class="ui-button-icon-primary ui-icon ui-icon-pencil"></span><span class="ui-button-text"></span>'*/
            +   '</div>':'')            
            + '</div>';
                
            html =
ed_html +             
'<div style="min-width:190px;height:124px;overflow-y:auto;">'+  // border:solid red 1px; 
'<div style="font-weight:bold;width:100%;padding-bottom:4px;">'+(recURL ?("<a href='"+recURL+"' target='_blank'>"+ recTitle + "</a>") :recTitle)+'</div>'+  //class="timeline-event-bubble-title"
'<div class="popup_body">'+ html_thumb + description +'</div>'+
((startDate)?'<div class="timeline-event-bubble-time" style="width:170px;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;">'+temporalToHumanReadableString(startDate)+'</div>':'')+
((endDate)?'<div class="timeline-event-bubble-time"  style="width:170px;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;">'+temporalToHumanReadableString(endDate)+'</div>':'')+
'</div>';

            }
                
            var marker = null;
            
            // scroll timeline if necessary
            if (!item.onVisibleTimeline()) {    //old
                ds.timemap.scrollToDate(item.getStart());
            }
            if(vis_timeline && item.opts.start){
                var stime = _getUnixTs(item.opts.recid, 'start');
                var range = vis_timeline.getWindow();
                if(stime<range.start || stime>range.end){
                        vis_timeline.moveTo(stime);
                }
                var ele = $("#"+timelinediv_id);
                marker = ele.find("[data-id="+ds.id+'-'+item.opts.recid +"]");
                //horizontal scroll
                if(marker) ele.scrollTop( marker.position().top );
            }
            
            // open window on MAP
            if (show_bubble_on_map) 
            {
                
                if (item.getType() == "marker") {
                    
                    if(popupURL){
                        $.get(popupURL, function(responseTxt, statusTxt, xhr){
                           if(statusTxt == "success"){
                                placemark.setInfoBubble(bubble_header+responseTxt+'</div>');
                                placemark.openBubble();
                           }
                        });
                        
                    }else{
                        placemark.setInfoBubble(html);
                        placemark.openBubble();
                    }
                    // deselect when window is closed
                    item.closeHandler = placemark.closeInfoBubble.addHandler(function() {
                        // deselect
                        ds.timemap.setSelected(undefined);
                        // kill self
                        placemark.closeInfoBubble.removeHandler(item.closeHandler);
                    });
                } else {
                    item.map.openBubble(item.getInfoPoint(), html);
                    item.map.tmBubbleItem = item;
                }
                
            } else {
                // open window on TIMELINE - replacement native Timeline bubble with our own implementation
                if(vis_timeline && marker){
                    
                    $( document ).bubble( "option", "content", html );
                    
                    //marker.scrollIntoView();
                    //setTimeout(function(){ $( marker ).click();}, 500);
                    
                }else if(item.event){    //reference to Simile timeline event   - NOT USED
                    
                    var painter = item.timeline.getBand(0).getEventPainter();
                    var marker = painter._eventIdToElmt[item.event.getID()]; //find marker div by internal ID
                    
                    //@todo - need to horizonatal scroll to show marker in viewport
                    
                    
                    
                    //change content 
                    $( document ).bubble( "option", "content", html );
                    
                    /*$( document ).bubble({
                            items: ".timeline-event-icon",
                            content:html
                    });*/
                    //show
                    $( marker ).click();
                    
                }else{
                    //neither map nor time data
                    //show on map center                  
                    // item.map.openBubble(item.getInfoPoint(), html);
                    // item.map.tmBubbleItem = item;
                }
            }
            
            if(top.HAPI4.currentUser.ugr_ID>0){
                $("#btnEditRecordFromBubble")
                    .button({icons: {
                        primary: "ui-icon-pencil"
                        }, text:false})
                     .click(function( event ) {
                event.preventDefault();
                //window.open(top.HAPI4.basePath + "page/recedit.php?db="+top.HAPI4.database+"&q=ids:"+recID, "_blank");
                window.open(top.HAPI4.basePathOld + "records/edit/editRecord.html?db="+top.HAPI4.database+"&recID="+recID, "_new");
                    });
            }

    }

    /**
    *  Keeps timeline zoom 
    */
    function _onWinResize(){

        if(tmap && keepMinDate && keepMinDate && tmap.timeline){
            keepMinMaxDate = false;
            setTimeout(function (){

                var band = tmap.timeline.getBand(0);
                band.setMinVisibleDate(keepMinDate);
                band.setMaxVisibleDate(keepMaxDate);
                tmap.timeline.layout();

                //fix bug with height of band
                _timeLineFixHeightBug();
                
                keepMinMaxDate = true;
                }, 1000);
        }
    }
    
    function _printMap() {
        
          //if(!gmap) return;
          //var map = gmap;          
          
          if(!tmap) return;

          tmap.getNativeMap().setOptions({
                panControl: false,
                zoomControl: false,
                mapTypeControl: false,
                scaleControl: false,     
                overviewMapControl: false,
                rotateControl: false
          });
         
          var popUpAndPrint = function() {
            dataUrl = [];
         
            $('#map canvas').filter(function() {
              dataUrl.push(this.toDataURL("image/png"));
            })
         
            var container = document.getElementById('map'); //map-canvas
            var clone = $(container).clone();
         
            var width = container.clientWidth
            var height = container.clientHeight
         
            $(clone).find('canvas').each(function(i, item) {
              $(item).replaceWith(
                $('<img>')
                  .attr('src', dataUrl[i]))
                  .css('position', 'absolute')
                  .css('left', '0')
                  .css('top', '0')
                  .css('width', width + 'px')
                  .css('height', height + 'px');
            });
         
            var printWindow = window.open('', 'PrintMap',
              'width=' + width + ',height=' + height);
            printWindow.document.writeln($(clone).html());
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
         
            tmap.getNativeMap().setOptions({
                panControl: true,
                zoomControl: true,
                mapTypeControl: true,
                scaleControl: true,     
                overviewMapControl: true,
                rotateControl: true
            });
          };
         
          setTimeout(popUpAndPrint, 500);
    }    
    

    //public members
    var that = {

        getClass: function () {return _className;},
        isA: function (strClass) {return (strClass === _className);},
        getVersion: function () {return _version;},

        load: function(_mapdata, _selection, _startup_mapdocument, _onSelectEventListener, _callback){
            _load(_mapdata, _selection, _startup_mapdocument, _onSelectEventListener, _callback);
        },

        getDataset: function ( dataset_id ){                
            return _getDataset( dataset_id );
        },
        
        changeDatasetColor: function ( dataset_id, new_color, updateOnMap ){                
            _changeDatasetColor( dataset_id, new_color, updateOnMap )
        },
        
        // _mapdata - recordset converted to timemap dataset
        addDataset: function(_mapdata){
            return _addDataset(_mapdata);
        },
        
        deleteDataset: function(dataset_name){
            _deleteDataset(dataset_name);
        },
        
        showDataset: function(dataset_name, is_show){
            _showDataset(dataset_name, is_show);
        },
        
        showSelection: function(_selection){
             selection = _selection || [];
             _showSelection( true );
        },
        
        onWinResize: function(){
            _onWinResize();
            if(tmap && tmap.map){ //fix google map bug
                tmap.map.resizeTo(0,0)
            }
        },

        printMap: function(){
             _printMap();
        },
        
        setTimelineMinheight: function(){
            if(vis_timeline){
                  vis_timeline.setOptions( {minHeight: $("#"+timelinediv_id).height()} ); 
            }
        },
        
        getNativeMap: function(){
             return (tmap)?tmap.getNativeMap():null;
        },
        
        //@todo - separate this functionality to different classes
        map_control: null,    //controls layers on map - add/edit/remove
        map_selection: null,  //@todo working with selection - search within selected area, highlight and popup info
        map_timeline: null,   //@todo vis timeline functionality
    }

    _init(_map, _timeline, _basePath, _mylayout);
    return that;  //returns object
}
