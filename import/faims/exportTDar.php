<?php

/*
* Copyright (C) 2005-2013 University of Sydney
*
* Licensed under the GNU License, Version 3.0 (the "License"); you may not use this file except
* in compliance with the License. You may obtain a copy of the License at
*
* http://www.gnu.org/licenses/gpl-3.0.txt
*
* Unless required by applicable law or agreed to in writing, software distributed under the License
* is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
* or implied. See the License for the specific language governing permissions and limitations under
* the License.
*/

/**
*   Export to tDar
*
* @author      Artem Osmakov   <artem.osmakov@sydney.edu.au>
* @copyright   (C) 2005-2013 University of Sydney
* @link        http://sydney.edu.au/heurist
* @version     3.1.0
* @license     http://www.gnu.org/licenses/gpl-3.0.txt GNU License 3.0
* @package     Heurist academic knowledge management system
*/

	require_once(dirname(__FILE__).'/../../common/connect/applyCredentials.php');
    require_once(dirname(__FILE__).'/../../common/php/dbMySqlWrappers.php');
    require_once(dirname(__FILE__).'/../../search/parseQueryToSQL.php');

    if(isForAdminOnly("to sync FAIMS database")){
        return;
    }

    /** The list of attachment files */
    define('API_FIELD_UPLOAD_FILE',"uploadFile");
    /** The meta-data describing the files, an xml file itself, adhering to the published schema */
    define('API_FIELD_RECORD',"record");
    /** The project to which the files are to be added. Will overwrite anything within the record */
    define('API_FIELD_PROJECT_ID',"projectId");


//@todo HARDCODED id of OriginalID
$dt_SourceRecordID = (defined('DT_ORIGINAL_RECORD_ID')?DT_ORIGINAL_RECORD_ID:0);
    if($dt_SourceRecordID==0){
        print "Detail type 'source record id' not defined";
        return;
    }

$dt_Geo = (defined('DT_GEO_OBJECT')?DT_GEO_OBJECT:0);

?>
<html>
<head>
  <title>Export to tDAR</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">

  <link rel=stylesheet href="../../common/css/global.css" media="all">
  <link rel=stylesheet href="../../common/css/admin.css" media="all">

  <script type="text/javascript" src="../../common/js/utilsUI.js"></script>
  <script type="text/javascript" src="../../external/jquery/jquery.js"></script>
  <script type="text/javascript" src="selectRectype.js"></script>
</head>
<body style="padding:44px;" class="popup">


    <script src="../../common/php/loadCommonInfo.php"></script>

    <div class="banner"><h2>Export to tDAR</h2></div>
    <div id="page-inner" style="width:640px; margin:0px auto; padding: 0.5em;">
<?php

    $rt_toexport = @$_REQUEST['rt'];
    $projname = @$_REQUEST['projname'];
    $projectId = @$_REQUEST['projid'];
    $host = @$_REQUEST['host'];
    $fusername = @$_REQUEST['username'];
    $fpwd = @$_REQUEST['pwd'];
    if(!$host) $host = '115.146.85.232:8080';
    if(!$fusername) $fusername = 'osmakov';
    if(!$fpwd) $fpwd = 'faims199';
    if(!$projectId) $projectId = 6813;

    $invalid = false; (!$projname || preg_match('[\W]', $str));

    //STEP 1 - define record types to be exported
    //if( !$rt_toexport || $invalid ){

        if(@$_REQUEST['step']=='1'){

            if($invalid){
                if($projname){
                    print "<div style='color:red'>Only letters, numbers and underscores (_) are allowed in project name</div>";
                }else {
                    print "<div style='color:red'>Project name is mandatory</div>";
                }
            }
            if(!$projectId){
                print "<div style='color:red'>Project ID is mandatory</div>";
            }
        }

//print ">>>>>".(function_exists('HTTP_Request2')?"YES":"NO")."<br>";

        print "<form name='startform' action='exportTDar.php' method='get'>";
        print "<input name='step' value='1' type='hidden'>";
        print "<input id='rt_selected' name='rt' type='hidden'>";
        print "<input name='db' value='".HEURIST_DBNAME."' type='hidden'>";
        print "<div>FAIMS project ID: <input name='projid' value='".$projectId."' size='10'></div><div id='help-div'>to get it create the project in the FAIMS repository and read the id from description page</div>";
        //print "<br><br><div>Project name: <input name='projname' value='".($projname?$projname:HEURIST_DBNAME)."' size='100'></div><br/>";
        print "<br/><br/><div>Record types to include in project:";

        print "<span id='selectedRectypes' style='width:270px;padding:10px;font-weight:bold;'></span>";
        print "<input type='button' value='Select Record Type' id='btnSelRecType1' onClick='onSelectRectype(\"".HEURIST_DBNAME."\")'/><br/><br/>";

        print "<br/><div>Host: <input name='host' value='".$host."' size='50'></div>";
        print "<br/><div>Username: <input name='username' value='".$fusername."' size='30'></div>";
        print "<br/><div>Password: <input name='pwd' value='".$fpwd."' size='30'></div>";

        print "<br/><br/><div><input type='submit' value='Start Export' /></div>";
        print "</form></div>";
        if($rt_toexport){
            print "<script>showSelectedRecTypes('".$rt_toexport."')</script>";
        }
    //exit();
    //}

    if (!($rt_toexport && !$invalid && $projectId)) {
        exit();
    }

        $folder = HEURIST_UPLOAD_DIR."faims/tdar/".$projectId;
        $folders = null;
        $batch = "#!/bin/bash\ncd ".HEURIST_DOCUMENT_ROOT.INSTALL_DIR;
        $coding_sheet = array();
        $images = array();
        $documents = array();
        $allowed_img_ext = array('jpg','jpeg','bmp','pict','tif','tiff','png','gif');
        $allowed_doc_ext = array('pdf','doc','docx','rtf','txt');

        rrmdir($folder);

        //create export folder
        if(!file_exists($folder)){
            if (!mkdir($folder, 0777, true)) {
                    die('Failed to create folder for '.$folder);
            }
        }else{ //clear folder
            array_map('unlink', glob($folder."/*"));
            //rrmdir($folder);
        }

        $rectyps = explode(",", $rt_toexport);
        print "<p>".$rt_toexport."</p>";

        $squery = "select rec_ID, dtl_DetailTypeID, dtl_Value, if(dtl_Geo is null, null, asText(dtl_Geo)) as dtl_Geo, ulf_ID, ulf_FilePath, ulf_FileName, ulf_OrigFileName, ulf_MimeExt, trm_Label ";
        $ourwhere = " and (dtl_RecID=rec_ID) ";
        $detTable = ", recDetails left join recUploadedFiles on ulf_ID = dtl_UploadedFileID left join defTerms on trm_ID = dtl_Value ";
        $order = "rec_ID, dtl_DetailTypeID";
        $params = array();

        $mysqli = mysqli_connection_overwrite("hdb_".@$_REQUEST['db']);

        $unsupported = array('relmarker','enum','relationtype','resource','separator','calculated','fieldsetmarker','urlinclude');


        /*
        * Main LOOP for all slected record types
        */
        foreach ($rectyps as $rt) {

            //get record type structure
            $dettypes = array();
            $recstruc = array();
            $query =  "select rst_DetailTypeID, rst_DisplayName, rst_DisplayHelpText, dty_Type from defRecStructure, defDetailTypes where rst_DetailTypeID=dty_ID and rst_RecTypeID=".$rt." order by rst_DisplayOrder";
            $res = $mysqli->query($query);
            if (!$res){
                //die('Failed to obtain strcuture for record type: '.$rt);
                print "<p class='error'>Failed to obtain strcuture for record type: ".$rt."</p>";
                continue;
            }else{
                while ($row = $res->fetch_row()) {  //$row = $res->fetch_assoc()) {

                    if(in_array($row[3], $unsupported)){
                        continue;
                    }

                    $dettypes[$row[0]] = array();
                    $recstruc[$row[0]] = $row;
                }
            }

            $params["q"] = "t:".$rt;

            //get all records for specified recordtype
            $query = prepareQuery($params, $squery, BOTH, $detTable, $ourwhere, $order);

 //DEBUG print "<p>".$query."</p>";
            $filename;

            $res = $mysqli->query($query);
            if (!$res){
                //die('Failed to obtain data for record type: '.$rt);
                print "<p class='error'>Failed to obtain data for record type: ".$rt."</p>";
                continue;
            }else{

                $recid = null;
                $records = array();
                $details = $dettypes;
                $hasdetails = false;
                while ($row = $res->fetch_row()) {  //$row = $res->fetch_assoc()) {
                    if($recid!=$row[0]){ //new line
                        if($hasdetails){
//print ">>>".$recid."  ADDED<br>";
                            $records[$recid] = $details;
                            $details = $dettypes;
                        }
                        $recid = $row[0];
                        $hasdetails = false;
                    }

                    $value = null;
                    if($row[3]){ //geographic
                        $value = $row[3];
                    }else if($row[4]){ //file id

                        $dtype = null;
                        $value = $row[7]; //original filename
                        //array($row[5], $row[6], $row[7], 8); //path and name and origname, mimeext
                        if(in_array($row[8], $allowed_img_ext)){
                            $images[$row[4]] =  $value;
                            $dtype = 'IMAGE';
                        }else if(in_array($row[8], $allowed_doc_ext)){
                            $documents[$row[4]] =  $value;
                            $dtype = 'DOCUMENT';
                        }else{
                            $value = null;
                        }

                        if($value){

                            $imgfolder = $folder."/".strtolower($dtype);
                            if(!file_exists($imgfolder) && !mkdir($imgfolder, 0777, true)){
                                   print "<p class='error'>'Failed to create folder: ".$imgfolder."</p>";
                            }else{
                                $imgfolder = $imgfolder."/".$row[4];
                                if(!file_exists($imgfolder)){
                                    if(!mkdir($imgfolder, 0777, true)){
                                        print "<p class='error'>'Failed to create folder: ".$imgfolder."</p>";
                                    }else{
                                           //copy file
                                           copy($row[5].$row[6], $imgfolder."/".$value);

                                           //create metadata
                                           $meta = getMetadata($dtype.' id '.$row[4], '', $dtype);
                                           file_put_contents($imgfolder."/".strtolower($dtype).".xml",  utf8_encode($meta->asXML()));

                                           //add command line to batch file
                                           $batch = $batch."\n java -cp  org.tdar.utils.CommandLineAPITool -http -username $fusername -password $fpwd -file ".$imgfolder."/ -host ".$host." -projectid ".$projectId;
                                    }
                                }
                            }

                        }


                    }else if($row[9]){ //term value
                        $value = $row[2];
                        //save into coding sheet
                        $coding_sheet[$row[2]] = $row[9];

                    }else if($row[2]){
                        $value = $row[2];   //add escape function
                    }


                    if($value){
                        /*if(!@$details[$row[1]]){ //such dettype already exists
                            $details[$row[1]] = array();
                        }*/

                        if(is_array(@$details[$row[1]])){
                            array_push($details[$row[1]], $value);
                            $hasdetails = true;
                        }
                    }
                }//while
                $res->close();

                if($hasdetails){
//print ">>>".$recid."  ADDED<br>";
                     $records[$recid] = $details;
                }

                if(count($records)<1){
                    print "<p>No data found for record type ".$rt."</p>";
                    continue;
                }


                //create folder for particular record type
                $rtfolder = $folder."/".$rt;
                if (!mkdir($rtfolder, 0777, true)) {
                    print "<p class='error'>'Failed to create folder: ".$rtfolder."</p>";
                    continue;
                    //die('Failed to create folder: '.$rtfolder);
                }

                $filename = $rtfolder."/".$rt.".csv";
                $fp = fopen($filename, 'w');
                foreach ($records as $rec_id => $details) {
                    $fields = array();
                    foreach ($details as $detail) {
                        array_push($fields, implode("|", $detail));
                    }
//DEBUG print implode(",", $fields)."<br>";
                    fputcsv($fp, $fields);
                }


/*
                $recid = null;
                $det_type = null;

                //$outp = "";
                $line = array();
                $value = array();

                while ($row = $res->fetch_row()) {  //$row = $res->fetch_assoc()) {

                    if($recid!=$row[0]){ //new line
                        if(count($value)>0){
                            array_push($line, implode("|",$value));
                        }
                        if(count($line)>0){
                            //$outp = $outp.implode(",",$line)."\n";
                            fwrite($fp, implode(",",$line)."\n");
                            print $recid."  ".implode(",",$line)."<br/><br/>";
                        }
                        $line = array();
                        $value = array();
                        $recid=$row[0];
                    }


                    if($det_type != $row[1]){
                        if(count($value)>0){
                            array_push($line, implode("|",$value));
                        }
                        $det_type = $row[1];
                        $value = array();
                    }

                    if($row[2]){
                        array_push($value, '"'.$row[2].'"');
                    }else{
                        array_push($value, "");
                    }
                }//while

                if(count($value)>0){
                    array_push($line, implode("|",$value));
                }
                if($line){
                    print ">>>".$recid."  ".implode(",",$line)."<br/>";
                    //$outp = $outp.implode(",",$line)."\n";
                    fwrite($fp, implode(",",$line)."\n");
                }
                $res->close();
*/
                fclose($fp);
            }

            //save csv output for dataset: records of particular record type
            //file_put_contents($rtfolder."/".$rt.".csv", $outp);

            //save metadata for dataset
            $meta = getMetadata('Heurist rectype '.$rt, 'heurist dataset for record type', 'DATASET');

            //$datatable = $meta->dataTables->addChild('dataTable');

            $columns = $meta->addChild('dataTables')->addChild('dataTable')->addChild('dataTableColumns');
            foreach ($recstruc as $dt_id => $detail) {

                    $column = $columns->addChild('dataTableColumn');

                    $column->columnEncodingType = 'UNCODED_VALUE';
                    /* @todo - to understand what does it mean
                    $column->codingSheetRef = '';
                    $column->delimiterValue = '';
                    $column->mappingColumn = '';
                    $column->measurementUnit = '';
                    $column->name = '';
                    $column->length = '';
                    */
                    $column->description = $detail[2];
                    $column->displayName = $detail[1];
                    $column->visible = 'true';
                    $column->ignoreFileExtension = 'false';

                    if($detail[3]=="date" || $detail[3]=="year"){
                        $column->columnDataType = 'DATETIME';
                    }else if($detail[3]=="integer"){
                        $column->columnDataType = 'BIGINT';
                    }else if($detail[3]=="float"){
                        $column->columnDataType = 'DOUBLE';
                    }else if($detail[3]=="freetext"){
                        $column->columnDataType = 'VARCHAR';
                    }else if($detail[3]=="blocktext" || $detail[3]=="geo"){
                        $column->columnDataType = 'TEXT';
                    }else if($detail[3]=="boolean"){
                        $column->columnDataType = 'BOOLEAN';
                    }
//ENUM('relmarker','enum','relationtype','resource','file','separator','calculated','fieldsetmarker','urlinclude')

            }


            $metadata_content = utf8_encode($meta->asXML());
            file_put_contents($rtfolder."/dataset.xml", $metadata_content);

            //../ROOT/WEB-INF/lib/*:.

            $batch = $batch."\n java -cp  org.tdar.utils.CommandLineAPITool -http -username $fusername -password $fpwd -file ".$rtfolder."/ -host ".$host." -projectid ".$projectId;

            $folders = $rtfolder."/".(($folders!=null)?",":"").$folders;


            $url = "http://".$host."/api/upload";//?uploadedItem=".urlencode($rtfolder."/dataset.xml");
            $postdata = array(
                //"uploadedItem" => $rtfolder."/dataset.xml",
                API_FIELD_RECORD => $metadata_content,
                API_FIELD_PROJECT_ID => $projectId);  //, API_FIELD_UPLOAD_FILE => "@".$filename);


            //$resp = post_request($url, $fusername, $fpwd, $postdata);
            $resp = http_post("115.146.85.232","8080", "/api/upload", $fusername, $fpwd, $postdata);

            //$postdata = array("loginUsername"=>$fusername, "loginPassword"=>$fpwd);
            //$resp = http_post("115.146.85.232","8080", "/login/process", null, null, $postdata);


            print "<xmp>".$resp."</xmp>";
            break;
        }


        //copy images
        print "<p>Export images</p>";


        //copy used terms to coding sheet
        print "<p>Create coding sheet from terms</p>";


        file_put_contents($folder."/loadtotdar.sh", $batch);

/*
        file_put_contents($folder."/input.properties",
"username=benben
password=ben
file=".$folders."
host=localhost:8080
projectid=".$projectId);
*/

            //print "<p>".$serverBaseURL."</p>";
        print "<p>Export completed</p>";


function getMetadata($title, $description, $dtype){
            $meta = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><tdar:dataset xmlns:tdar="http://www.tdar.org/namespace" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://localhost:8180/schema/current schema.xsd" />');

            $meta->title = $title;
            $meta->description = $description;
            $meta->resourceType = $dtype;
            $meta->dateNormalized = '2013';

            $meta->externalReference='false';
            $meta->inheritingCollectionInformation='false';
            $meta->inheritingCulturalInformation='false';
            $meta->inheritingIdentifierInformation='false';
            $meta->inheritingInvestigationInformation='false';
            $meta->inheritingMaterialInformation='false';
            $meta->inheritingNoteInformation='false';
            $meta->inheritingOtherInformation='false';
            $meta->inheritingSiteInformation='false';
            $meta->inheritingSpatialInformation='false';
            $meta->inheritingTemporalInformation='false';
            //$meta->relatedDatasetData=null;
            return $meta;
}


// remove directory recursively
function rrmdir($dir) {
  if (is_dir($dir)) {
        $objects = scandir($dir);
        foreach ($objects as $object) {
            if ($object != "." && $object != "..") {
                if (filetype($dir."/".$object) == "dir"){
                    rrmdir($dir."/".$object);
                } else {
                    unlink   ($dir."/".$object);
                }
            }
        }
        reset($objects);
        rmdir($dir);
  }
}


function prepareQuery($params, $squery, $search_type, $detailsTable, $where, $order)
{
            $squery = REQUEST_to_query($squery, $search_type, $params);
            //remove order by
            $pos = strpos($squery," order by ");
            if($pos>0){
                $squery = substr($squery, 0, $pos);
            }

            //$squery = str_replace(" where ", ",".$detailsTable." where ", $squery);
            $squery = preg_replace('/ where /', $detailsTable." where ", $squery, 1);

            //add our where clause and limit
            $squery = $squery.$where." order by ".$order; //." limit ".$limit;

            return $squery;
}

function post_request($url, $fusername, $fpwd, $postdata){


error_log(">>>>>".$fusername.":".$fpwd);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_HEADER, 1); //Tell curl not to return headers, but do return the response
        //curl_setopt($ch, CURLOPT_VERBOSE, 1);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        //curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/4.0 (compatible;)");
        curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1 );
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_USERPWD, $fusername.":".$fpwd);
        curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_ANY); //CURLAUTH_ANY
        curl_setopt($ch, CURLOPT_TIMEOUT, 4);

        //curl_setopt($ch, CURLOPT_PROXY, HEURIST_HTTP_PROXY);

        //curl_setopt($ch, CURLOPT_POSTFIELDS, $postdata);

        $response = curl_exec($ch);
        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
error_log(">>>>>".$statusCode."  ".$response);

        return $statusCode."  ".$response;

}

function http_post($server, $port, $url, $fusername, $fpwd, $vars) {

    // get urlencoded vesion of $vars array
    $urlencoded = "";

    foreach ($vars as $Index => $Value)
        $urlencoded .= urlencode($Index ) . "=" . urlencode($Value) . "&";

    $urlencoded = substr($urlencoded,0,-1);

    if(!$fusername){
        $headers = "POST $url HTTP/1.0\n"
        . "Content-Type: application/x-www-form-urlencoded\n"
        . "Content-Length: ". strlen($urlencoded) . "\n\n";
    }else{
        $headers = "POST $url HTTP/1.1\r\n".
        "Content-Type: application/x-www-form-urlencoded\n".
        "User-Agent: PHP-Code\n".
        "Content-Length: " . strlen($urlencoded) . "\n\n".
        "Authorization: Basic ".base64_encode($fusername.':'.$fpwd)."\n"
        ."Connection: close\n\n";
    }

    $fp = fsockopen($server, $port, $errno, $errstr, 10);
    if (!$fp) return "ERROR: fsockopen failed.\r\nError no: $errno - $errstr";

    fputs($fp, $headers);
    fputs($fp, $urlencoded);

    $ret = "";
    while (!feof($fp)) $ret .= fgets($fp, 1024);

    fclose($fp);
    return $ret;
}


?>
  </div>
</body>
</html>

