<?php

/**
* manageUsers.php
* workgroup listing
*
* @version 2011.0510
* @autor: Artem Osmakov
*
* @copyright (C) 2005-2010 University of Sydney Digital Innovation Unit.
* @link: http://HeuristScholar.org
* @license http://www.gnu.org/licenses/gpl-3.0.txt
* @package Heurist academic knowledge management system
* @todo
**/

require_once(dirname(__FILE__).'/../../common/connect/applyCredentials.php');
if (!is_admin()) {
    print "<html><head><link rel=stylesheet href='../../common/css/global.css'></head><body><div class=wrap><div id=errorMsg><span>You must be logged in as system administrator to add or change users</span><p><a href=".HEURIST_URL_BASE."common/connect/login.php?logout=1&amp;db=".HEURIST_DBNAME." target='_top'>Log out</a></p></div></div></body></html>";
    return;
}

?>

<html>
	<head>


		<meta http-equiv="content-type" content="text/html; charset=utf-8">
		<title>Heurist - Users</title>

		<link rel=stylesheet href="../../common/css/global.css">

		<!-- YUI -->
		<link rel="stylesheet" type="text/css" href="../../external/yui/2.8.2r1/build/container/assets/skins/sam/container.css">

		<link rel="stylesheet" type="text/css" href="../../external/yui/2.8.2r1/build/fonts/fonts-min.css" />
		<link rel="stylesheet" type="text/css" href="../../external/yui/2.8.2r1/build/tabview/assets/skins/sam/tabview.css" />
		<script type="text/javascript" src="../../external/yui/2.8.2r1/build/yahoo-dom-event/yahoo-dom-event.js"></script>
		<script type="text/javascript" src="../../external/yui/2.8.2r1/build/element/element-min.js"></script>
		<!--script type="text/javascript" src="../../external/yui/2.8.2r1/build/history/history-min.js"></script!-->
		<script type="text/javascript" src="../../external/yui/2.8.2r1/build/json/json-min.js"></script>

		<!-- DATATABLE DEFS -->
		<link type="text/css" rel="stylesheet" href="../../external/yui/2.8.2r1/build/datatable/assets/skins/sam/datatable.css">
		<!-- datatable Dependencies -->
		<script type="text/javascript" src="../../external/yui/2.8.2r1/build/datasource/datasource-min.js"></script>
		<!-- OPTIONAL: Drag Drop (enables resizeable or reorderable columns) -->
		<script type="text/javascript" src="../../external/yui/2.8.2r1/build/dragdrop/dragdrop-min.js"></script>
		<!-- Source files -->
		<script type="text/javascript" src="../../external/yui/2.8.2r1/build/datatable/datatable-min.js"></script>
		<!-- END DATATABLE DEFS-->

		<!-- PAGINATOR -->
		<link rel="stylesheet" type="text/css" href="../../external/yui/2.8.2r1/build/paginator/assets/skins/sam/paginator.css">
		<script type="text/javascript" src="../../external/yui/2.8.2r1/build/paginator/paginator-min.js"></script>
		<!-- END PAGINATOR -->

		<script type="text/javascript" src="../../external/yui/2.8.2r1/build/container/container-min.js"></script>

		<script type="text/javascript" src="../../external/jquery/jquery.js"></script>

        <link rel="stylesheet" type="text/css" href="../../common/css/global.css">
    	<link rel="stylesheet" type="text/css" href="../../common/css/admin.css">
		<style type="text/css">
			.tooltip {
				position:absolute;
				z-index:999;
				left:-9999px;
				top:0px;
				background-color:#dedede;
				padding:5px;
				border:1px solid #fff;
				min-width:200;
			}

			.yui-skin-sam .yui-dt td {
				margin:0;padding:0;
				border:none;
				text-align:left;
			}
			.yui-skin-sam .yui-dt-list td {
				border-right:none; /* disable inner column border in list mode */
			}
			.yui-skin-sam .yui-dt tr.inactive{/* inactive users */
				/*background-color: #EEE;*/
				color:#999 !important;
			}
			.yui-skin-sam .yui-dt tr.inactive *{/* inactive users */
				/*background-color: #EEE;*/
				color:#999 !important;
			}

			.labeldiv{
				display: inline-block;
				width: 60px;
				text-align: right;
			}
			.yui-dt table {
    				width: 800;
			}
			.listing{
			}
			.selection{
			}
			.activated{
				display:inline-block;
			}
			.deactivated{
				display:none;
			}
		</style>

	</head>

	<body class="popup yui-skin-sam" style="overflow:auto;">
    <div>
    	<div class="banner"><h2>Manage Users</h2></div>

		<script type="text/javascript" src="../../common/js/utilsLoad.js"></script>
		<script type="text/javascript" src="../../common/js/utilsUI.js"></script>
		<script src="../../common/php/displayPreferences.php"></script>

		<!-- access to functions about current user -->
		<script src="loadUserInfoShort.php"></script>
		<script type="text/javascript" src="manageUsers.js"></script>

		<div class="tooltip" id="toolTip2"><p>popup popup</p></div>

	<div id="page-inner">

			<div id="currUserInfo"></div>

			<h2 id="lblGroupTitleSelection" class="selection"></h2>

			<div>
				<div id="pnlFilterByGroup">
                        <label for="inputFilterByGroup">Filter by group:</label>
                            <select id="inputFilterByGroup" size="1" style="width:138px">
                                <option value="all">all groups</option>
                            </select>
						<!-- Too many bells and whistles, really confusing, will never have more than a few groups
                        <label>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Filter pulldown:</label>
						<input type="text" id="inputFilterGroup"  style="width:40px;" value=""/> (3+ characters)
                        -->
				</div>

				<div id="pnlGroupTitle" style="display:none;">
					<h2 id="lblGroupTitle"></h2>
				</div>

                <div  id="pnlFilterByRole" style="display:none;">
					<br>
                    <label style="width:120px;display:inline-block;text-align:right">Filter by role:</label>
					<select id="inputFilterByRole" name="inputFilterByRole" size="1" style="width:75px">
						<option value="all">all roles</option>
						<option value="admin">admin</option>
						<option value="member">member</option>
						<!-- <option value="invited">invited</option>
						<option value="request">request</option> -->
                	</select>
				</div>

			</div>

            <p>

			<div id="toolbar2">

				<label style="width:120px;display:inline-block;text-align:right">Filter by name:</label>
					<input type="text" id="inputFilterByName" style="width:140px;" value=""/>

				<div id="divFilterByEnable" class="listing">
					<label>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</label>
                    <input type="radio" id="inputFilterByEnable1" name="inputFilterByDisbale"
                            value="all" checked="checked"/>&nbsp;&nbsp;&nbsp;All&nbsp;&nbsp;&nbsp;
                    <input type="radio" id="inputFilterByEnable2" name="inputFilterByDisbale"
                            value="disbledonly"/> &nbsp;&nbsp;Inactive
				</div>

				<div id="divFilterBySelection" class="selection">
					<label>Show:</label>
                    <input type="radio" id="inputFilterBySelection1"
                            name="inputFilterBySelection" value="all" checked="checked"/>&nbsp;All&nbsp;
                    <input type="radio" id="inputFilterBySelection2"
                            name="inputFilterBySelection" value="selonly"/> Selected

                <!--&nbsp;&nbsp;&nbsp;&nbsp;<input type="button" id="btnClearSelection" value="clear" title="clear selection"/> -->
				</div>

			</div>

			<div id="tb_top" style="height:30">
				<div style="display:inline-block; max-width:150;"><div id="dt_pagination_top"></div></div>
				<!-- selection controls -->
				<div id="pnlCtrlSel1"  class="selection" style="float:right; text-align:right;padding-top:5px;">
					<label id="lblSelect1"></label>
					<input type="button" tabindex="12" value="Cancel" onClick="userManager.cancel();" />
					<input type="button" tabindex="11" id="btnApply1" value="Add Users to Group" onClick="userManager.returnSelection();" />
				</div>
				<!-- edit contols -->
				<div id="pnlCtrlEdit1"  class="listing" style="float:right; text-align:right;padding-top:5px;">
					<input type="button" tabindex="12" id="btnAdd1" value="Create New User" onClick="userManager.editUser(-1);" />
					<div id="btnSelectAdd1"><input type="button" tabindex="11" value="Find and Add User"
						title="Find and add user to this group" onClick="userManager.findAndAddUser();" /></div>
				</div>
			</div>

			<div id="tabContainer">

				<script  type="text/javascript">

				//  starts initialization on load completion of this window
				function createManagerObj(){
					userManager = new  UserManager(false, false, true); //nonfilter, no selection, in window
				}
				YAHOO.util.Event.addListener(window, "load", createManagerObj);

				</script>
			</div>


			<div id="tb_top" style="height:30">
				<div style="display:inline-block; max-width:150;"><div id="dt_pagination_bottom"></div></div>

				<!-- selection controls -->
				<div id="pnlCtrlSel1"  class="selection" style="float:right; text-align:right;padding-top:5px;">
					<label id="lblSelect1"></label>
					<input type="button" tabindex="12" value="Cancel" onClick="userManager.cancel();" />
					<input type="button" tabindex="11" id="btnApply2" value="Add Users to Group" onClick="userManager.returnSelection();" />
				</div>
				<!-- edit contols -->
				<div id="pnlCtrlEdit2"  class="listing" style="float:right; text-align:right;padding-top:5px;">
					<input type="button" tabindex="12" id="btnAdd2" value="Create New User" onClick="userManager.editUser(-1);" />
					<div id="btnSelectAdd2"><input type="button" tabindex="11" value="Find and Add User"
						title="Find and add user to this group" onClick="userManager.findAndAddUser();" /></div>
				</div>

			</div>
	</div></div>

	</body>
</html>
