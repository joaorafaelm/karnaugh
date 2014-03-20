// Copyright (C) 2014 João Rafael.  
// 	  João Rafael Email:    joaoraf[ at ]me.com
//
// 	  This is a adapted file from KARNAUGH MAP EXPLORER 2.0, created by Mike Sandige and Richard Sandige 
// 	  COPYRIGHT(C) 2011 | GNU General Public License
// 	  URL: http://www.ee.calpoly.edu/media/uploads/resources/KarnaughExplorer_1.html
// 	  Mike Sandige Email:    mike_s_101[ at ]hotmail.com
// 	  Richard Sandige Email: rsandige[ at ]calpoly.edu
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 2
// as published by the Free Software Foundation; 

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// for a good javascript reference, see http://wp.netscape.com/eng/mozilla/3.0/handbook/javascript/

// Constants
var MaxVariableCount=4;							
var VariableNames = new Array("A","B","C","D");	
var Width  = new Array(0,2,2,4,4);				// width of Kmap for each VariableCount
var Height = new Array(0,2,2,2,4);				// height of Kmap for each VariableCount
var BitOrder = new Array(0,1,3,2);				// bits across and down Kmap
var BackgroundColor="white";
var AllowDontCare=false;						// true doesn't guarantee a minimal solution
var DontCare = "X";

// Variables (initialized here)
var VariableCount=2;							//1..4
var TruthTable = new Array();					// truth table structure[row][variable]
var KMap = new Array();							// KMap[across][down]
var Equation = new Array();						// solution results 
var FunctionText = "";							// F(ABC)= 
var EquationHighlightColor = "rgb(243,194,86)";
var Heavy = 20;

for (i=0; i<Math.pow(2,MaxVariableCount); i++)
{
	Equation[i] = new Array();					// for each term in result function
	Equation[i].ButtonUIName = "EQ" + i;		// used to generate HTML IDs
	Equation[i].Expression = "";				// HTML text for term 
	Equation[i].Rect = null;					// 'rect' for term 
	Equation.UsedLength=0;						// # of terms in current result function
}

Equation.UsedLength=1;
Equation[0].Expression="0";

// initialize the truth table and kmap structure for the given number of variables
function InitializeTables(VarCount)
{
	TruthTable = new Array();
	KMap = new Array();							

	VariableCount = VarCount;
	KMap.Width=Width[VariableCount];
	KMap.Height=Height[VariableCount];

	for (i=0; i<Math.pow(2,VariableCount); i++)
	{
		TruthTable[i] = new Array();
		TruthTable[i].Index = i;
		TruthTable[i].Name = i.toString(2);
		TruthTable[i].ButtonUIName = "TT"+TruthTable[i].Name;
		TruthTable[i].TTROWUIName = "TTROW" + TruthTable[i].Name;
		for (j=0; j<Math.pow(2,VariableCount); j++)
		{
			TruthTable[i][j] = new Array();
			TruthTable[i][j].Variable = (i & (1<<(VariableCount-(1+j)))?1:0)?true:false;
			TruthTable[i][j].Name = VariableNames[j];
			TruthTable[i][j].KMapEntry = null;
		}
	}

	KMap.XVariables = KMap.Width/2;
	KMap.YVariables = KMap.Height/2;

	for (w=0; w<KMap.Width; w++)
	{
		KMap[w]=new Array();
		for (h=0; h<KMap.Height; h++)
		{
			KMap[w][h]=new Array();
			KMap[w][h].Value = false;
			mapstr = BinaryString(BitOrder[w],KMap.XVariables) + BinaryString(BitOrder[h],KMap.YVariables);
			mapval = parseInt(mapstr,2);
			KMap[w][h].TruthTableEntry = TruthTable[mapval];
			KMap[w][h].TruthTableEntry.KMapEntry = KMap[w][h];
			KMap[w][h].ButtonUIName = "KM" + KMap[w][h].TruthTableEntry.Name;
			KMap[w][h].TDUIName = "TD" + KMap[w][h].TruthTableEntry.Name;
			KMap[w][h].Covered = false;
			KMap[w][h].Variable = new Array();
			for (i=0; i<VariableCount; i++)
			{
				KMap[w][h].Variable[i] = KMap[w][h].TruthTableEntry[i].Variable;
			}
		}
	}

	FunctionText = "ƒ(";
	for (i=0; i<VariableCount; i++)
	{
		FunctionText += VariableNames[i];
	}
	FunctionText+=")";
}

InitializeTables(VariableCount);

// returns a color to use for the backround for a given boolean value 
//    Value is expected to be "1", "0", or "X"
function HighlightColor( Value )
{
	if (Value=="1") return "rgb(200,90,60)";    //0x00FF00;
	if (Value=="0") return "rgb(0,195,151)"; //~0xFF0000;
	return "gray"; //0x7F7F7F;
}

// returns a color to use for rollover highlighting 
//    Value is expected to be "1", "0", or "X"
function RectHighlightColor( Value )
{
	return EquationHighlightColor;
}

// init code (setup display according to query parameters)
function Load()
{
	if (PageParameter("Variables")=="3")
	{
		ChangeVariableNumber( 3 );
	}
	else if (PageParameter("Variables")=="2")
	{
		ChangeVariableNumber( 2 );
	}
	else if (PageParameter("Variables")=="4")
	{
		ChangeVariableNumber( 4 );
	}
	else 
	{
		ChangeVariableNumber( VariableCount );
	}
	if (PageParameter("DontCare")=="true")
	{
		ToggleDontCare();
	}
}

window.onload = Load;

// constructs a Rect type
function CreateRect( x,y,w,h )
{
	var Obj=new Array();
	Obj.x = x;
	Obj.y = y;
	Obj.w = w;
	Obj.h = h;
	return Obj;
}

// Comparison of two trinary 'boolean' values (a boolean value or don't care)
function Compare( Value1, Value2 )
{
	if ( (Value1 == Value2) || (Value1==DontCare) || (Value2==DontCare) )
	{
		return true;
	}
	else
	{
		return false;
	}
}

// Determines if a Rect with a given value fits on the KMap: it 'fits' if every square of the Rect
// matches (copmares with) the TestValue.
// Assumes top left of Rect is within the KMap.
// Assumes Rect is not larger than KMap
function TestRect( Rect, TestValue )
{
	var dx=0;
	var dy=0;
	for (dx=0; dx<Rect.w; dx++)
	{
		for (dy=0; dy<Rect.h; dy++)
		{
			var Test = KMap[(Rect.x+dx)%KMap.Width][(Rect.y+dy)%KMap.Height].Value;
			if (!Compare(TestValue,Test))
			{
				return false;
			}
		}
	}
	return true;
}

// Returns true if for every square of the Rect in the KMap, the .Covered flag is set
//    or the value of the square is don't care.
function IsCovered( Rect )
{
	var dx=0;
	var dy=0;
	for (dx=0; dx<Rect.w; dx++)
	{
		for (dy=0; dy<Rect.h; dy++)
		{
			if (!KMap[(Rect.x+dx)%KMap.Width][(Rect.y+dy)%KMap.Height].Covered) 
			{
				//treat dont care's as already covered
				if (!(KMap[(Rect.x+dx)%KMap.Width][(Rect.y+dy)%KMap.Height].Value==DontCare))
				{
					return false;
				}
			}
		}
	}
	return true;
}

// Sets the .Covered flag for every square of the Rect in the KMap
function Cover( Rect, IsCovered )
{
	var dx=0;
	var dy=0;
	for (dx=0; dx<Rect.w; dx++)
	{
		for (dy=0; dy<Rect.h; dy++)
		{
			KMap[(Rect.x+dx)%KMap.Width][(Rect.y+dy)%KMap.Height].Covered = IsCovered;
		}
	}
}

// Tries every x,y location in the KMap to see if the given rect size (w,h) will fit there
//   (matches in value).  For each location that fits, creates a rect and adds it to the Found 
//   array.  If DoCover is true, also sets the KMap .Cover flag for the rects that fit.
function SearchRect( w,h, TestValue, Found, DoCover )
{
	if ((w>KMap.Width) || (h>KMap.Height))
	{
		return;  // rect is too large
	}
		
	var x=0;
	var y=0;
	var across = (KMap.Width==w) ?1:KMap.Width;
	var down   = (KMap.Height==h)?1:KMap.Height;
	for (x=0; x<across; x++)
	{
		for (y=0; y<down; y++)
		{
			var Rect = CreateRect(x,y,w,h);
			if (TestRect(Rect,TestValue))
			{
				if (!IsCovered(Rect))
				{
					Found[Found.length]=Rect;
					if (DoCover) Cover(Rect, true);
				}
			}
		}
	}
}

// Iterates through an array of Rects (in order) to determine which of them
//  cover something in the KMap and which don't (because previous ones already
//  have covered enough).  Adds rects that do cover something to the Used array.
function TryRects(Rects,Used)
{
    var j = 0;
    for (j = 0; j < Rects.length; j++)
    {
        var Rect = Rects[j];
        if (TestRect(Rect, true))
        {
            if (!IsCovered(Rect))
            {
                Used[Used.length] = Rect;
                Cover(Rect, true);
            }
        }
    }
}

// Adds the given Weight to every element of the Weights map that corresponds to the Rect.
function AddRectWeight(Weights, Rect, Weight)
{
    var dx = 0;
    var dy = 0;
    for (dx = 0; dx < Rect.w; dx++)
    {
        for (dy = 0; dy < Rect.h; dy++)
        {
            Weights[(Rect.x + dx) % KMap.Width][(Rect.y + dy) % KMap.Height] += Weight;
        }
    }
}

// Retrieves a weight value of a rect, by summing the weight of each square in the Weights
// map that correspond to the Rect
function GetRectWeight(Weights, Rect)
{
    var dx = 0;
    var dy = 0;
    var W = 0;
    for (dx = 0; dx < Rect.w; dx++)
    {
        for (dy = 0; dy < Rect.h; dy++)
        {
            W += Weights[(Rect.x + dx) % KMap.Width][(Rect.y + dy) % KMap.Height];
        }
    }
    return W;
}


// Used for the array sorting function to sort objects by each object's .Weight member 
function SortByWeight(a, b)
{
    if (a.Weight < b.Weight) return -1;
    else if (a.Weight > b.Weight) return 1;
    else return 0;
}

// Returns true if two Rects overlap (share any squares)
function OverlappingRects(R1,R2)
{
    if ( (R1.x+R1.w>R2.x) && 
         ((R2.x+R2.w)>(R1.x)) &&
         (R1.y+R1.h>R2.y) && 
         ((R2.y+R2.h)>(R1.y))
        )
        return true;
    return false;
}

// Sorts a list of Rects that cover squares of the KMap, and returns a minimal
// subset of those Rects that cover the same squares
function FindBestCoverage(Rects,AllRects)
{
    // create a 'Weight' map
    var Weights = new Array();
    for (w = 0; w < KMap.Width; w++)
    {
        Weights[w] = new Array();
        for (h = 0; h < KMap.Height; h++)
        {   // initial weight is 0 if not already covered, high if already covered
            Weights[w][h] = (KMap[w][h].Covered)?Heavy:0;
        }
    }
    // seed the weight map with 1 for every square covered by every Rect
    var i = 0;
    for (i = 0; i < Rects.length; i++)
    {
        AddRectWeight(Weights, Rects[i], 1);
    }

    // generate a set of rects sorted by weight - but  after selecting each minimal
    // weighted rect, re-weight the map for the next selection.  Re-weight by
    // making the squares of the selected Rect very heavy, but reduce the
    // weight of any squares for Rects that overlap the selected Rect.  This has the
    // effect of pushing the rects that duplicate KMap coverage to the back of the list, 
    // while bubbling non-overlapping maximal covering rects to the front.
    var SortedRects = new Array();
    while (Rects.length>0)
    {
        var j=0;
        for (j = 0; j < Rects.length; j++)
        {   // get the weight for the remaining Rects
            Rects[j].Weight = GetRectWeight(Weights, Rects[j]);
        }
        // Sort the array to find a Rect with minimal weight
        Rects.sort(SortByWeight);
        SortedRects.push(Rects[0]);
        if (Rects.length == 1)
        {   // just found the last Rect, break out
            break;
        }
        // Make the weight map very heavy for the selected Rect's squares
        AddRectWeight(Weights, Rects[0], Heavy);
        
        // Reduce the weight for Rects that overlap the selected Rect
        for (j=0; j< Rects.length; j++)
        {
            if (OverlappingRects(Rects[0], Rects[j]))
            {
                AddRectWeight(Weights, Rects[j], -1);
            }
        }
        // continue processing with all the Rects but the first one
        Rects = Rects.slice(1);
    }
    
    // determine which of the sorted array of Rects are actually needed
    TryRects(SortedRects, AllRects);
}
	
//Finds the minimized equation for the current KMap.
function Search()
{
    var Rects = new Array();
    Cover(CreateRect(0, 0, KMap.Width, KMap.Height), false);

    // Find the (larger) rectangles that cover just the quares in the KMap
    //  and search for smaller and smaller rects
    SearchRect(4, 4, true, Rects, true);
    SearchRect(4, 2, true, Rects, true);
    SearchRect(2, 4, true, Rects, true);
    SearchRect(1, 4, true, Rects, true);
    SearchRect(4, 1, true, Rects, true);
    SearchRect(2, 2, true, Rects, true);

    // 2x1 sized rects  - These have to be handled specially in order to find a 
    //  minimized solution.  
    var Rects2x1 = new Array();
    SearchRect(2, 1, true, Rects2x1, false);
    SearchRect(1, 2, true, Rects2x1, false);
    FindBestCoverage(Rects2x1, Rects);

    // add the 1x1 rects
    SearchRect(1, 1, true, Rects, true);

    //check to see if any sets of (necessary) smaller rects fully cover larger ones (if so, the larger one is no longer needed)
    Cover(CreateRect(0, 0, KMap.Width, KMap.Height), false);
    for (i = Rects.length - 1; i >= 0; i--)
    {
        if (IsCovered(Rects[i]))
        {
            Rects[i] = null;
        }
        else
        {
            Cover(Rects[i], true);
        }
    }
	
	ClearEquation();	
	for (i=0;i<Rects.length; i++)
	{
		if (Rects[i]!=null)
		{
			RectToEquation(Rects[i]);
		}
	}
	if (Equation.UsedLength==0)
	{
		Equation.UsedLength=1;
		Equation[0].Expression="0";
		Equation[0].Rect = CreateRect(0,0,KMap.Width,KMap.Height);
	}
}

function ClearEquation()
{
	for (i=0; i<Equation.length; i++)
	{
		Equation[i].Rect	= null;
	}
	Equation.UsedLength=0;
}

// returns true if the rect is entirely within a singel given variable 
function IsConstantVariable( Rect, Variable )
{
	var dx=0;
	var dy=0;
	var topleft = KMap[Rect.x][Rect.y].Variable[Variable];
	for (dx=0; dx<Rect.w; dx++)
	{
		for (dy=0; dy<Rect.h; dy++)
		{
			test = KMap[(Rect.x+dx)%KMap.Width][(Rect.y+dy)%KMap.Height].Variable[Variable];
			if (test!=topleft)
			{
				return false;
			}
		}
	}
	return true;
}

// Turns a rectangle into a text minterm (in HTML)
function RectToEquation( Rect )
{
	var Text = "";
	var i=0;
	for (i=0; i<VariableCount; i++)
	{
		if (IsConstantVariable( Rect, i))
		{
		//	Text += VariableNames[i];
		//	if (!KMap[Rect.x][Rect.y].Variable[i])
		//	{
		//		Text += "'";
		//	}
			if (!KMap[Rect.x][Rect.y].Variable[i])
			{
				Text += "<span style='text-decoration: overline'>"+VariableNames[i]+"</span> ";
			}
			else
			{
				Text += VariableNames[i] + " ";
			}
		}
	}
	if (Text.length==0)
	{
		Text="1";
	}
	Equation[Equation.UsedLength].Rect  = Rect;
	Equation[Equation.UsedLength].Expression = Text;
	Equation.UsedLength++;
	
	return Text;
}
	

// turns a boolean into a display value  true->"1"  false->"0"
function DisplayValue( bool )
{
	if (bool==true)
	{
		return "1";
	}
	else if (bool==false)
	{
		return "0";
	}
	else return DontCare;
}

// Turns a number into binary in text (prepends 0's to length 'bits')
function BinaryString( value, bits )
{
	var str = value.toString(2);
	var i=0;
	for (i=0; i<bits; i++)
	{
		if (str.length<bits)
		{
			str = "0" + str;
		}
	}
	return str;
}

// redraws UI (with no highlights)
function UpdateUI()
{
    var i = 0;
    for (i = 0; i < TruthTable.length; i++)
    {
        var Val = DisplayValue(TruthTable[i].KMapEntry.Value);
        //Truth Table
  
        SetValue(TruthTable[i].ButtonUIName, Val);
        SetBackgroundColor(TruthTable[i].ButtonUIName, HighlightColor(Val));
        SetBackgroundColor(TruthTable[i].TTROWUIName, HighlightColor(Val));

        //KMap
        SetValue(TruthTable[i].KMapEntry.ButtonUIName, Val);
        SetBackgroundColor(TruthTable[i].KMapEntry.ButtonUIName, HighlightColor(Val));
        SetBackgroundColor(TruthTable[i].KMapEntry.TDUIName, HighlightColor(Val));
    }
    SetInnerHTML("EquationDiv", GenerateEquationHTML());
}
	
function ToggleValue( Value )
{
	if (AllowDontCare)
	{
		if (Value==true)
		{
			return DontCare;
		}
		else if (Value==DontCare)
		{
			return false;
		}
		else if (Value==false)
		{
			return true;
		}
	}
	else
	{
		return !Value;
	}
}

function ToggleTTEntry( TTEntry )
{
	TTEntry.KMapEntry.Value = ToggleValue(TTEntry.KMapEntry.Value);
	RefreshUI();
}

function ToggleKMEntry( KMEntry )
{
	KMEntry.Value = ToggleValue(KMEntry.Value);
	RefreshUI();
}

function RefreshUI()
{
	ClearEquation();
	Search();
	UpdateUI();
}

// redraws UI with the given equation highlighted
function SetShowRect( EquationEntry, EquationIndex )
{	
	if (EquationEntry==null)
	{
		UpdateUI();
		return;
	}
	else
	{
	    var ShowRect = EquationEntry.Rect;

	    var dx = 0;
        var dy = 0;
        for (dx = 0; dx < ShowRect.w; dx++)
        {
            for (dy = 0; dy < ShowRect.h; dy++)
            {
                var KMEntry = KMap[(ShowRect.x + dx) % KMap.Width][(ShowRect.y + dy) % KMap.Height];
                var Val = DisplayValue(TruthTable[i].KMapEntry.Value);
                //KMap
                SetBackgroundColor(KMEntry.ButtonUIName, RectHighlightColor(Val));
                SetBackgroundColor(KMEntry.TDUIName, RectHighlightColor(Val));
                //Truth Table
                SetBackgroundColor(KMEntry.TruthTableEntry.ButtonUIName, RectHighlightColor(Val));
                SetBackgroundColor(KMEntry.TruthTableEntry.TTROWUIName, RectHighlightColor(Val));
            }
        }
	}
	SetBackgroundColor(Equation[EquationIndex].ButtonUIName,EquationHighlightColor);
}

function GetElement(Name)
{
	if (document.getElementById)
	{
		return document.getElementById(Name);
	}
	else if (document.all)
	{
		return document.all[Name];
	}
	else if (document.layers)
	{
		return document.layers[Name]//not sure this works in all browsers... element.style would be document.layers[Name];
	}
}

function SetInnerHTML(Name,Text)
{
	GetElement(Name).innerHTML = Text
}

function SetBackgroundColor(Name,Color)
{
	GetElement(Name).style.backgroundColor = Color;
}

function SetValue(Name,Value)
{
	GetElement(Name).value = Value;
}

function GenerateTruthTableHTML()
{
	var Text = "<table ID=\"TruthTableID\" style=\"text-align:center\">";
	{
		Text = Text + "<thead style=\"background: rgb(49,60,78);text-align:center\"><tr>";
		var i=0;
		for (i=0; i<VariableCount; i++)
		{
			Text = Text + "<th>"+VariableNames[i]+"</th>";
		}
		Text = Text + "<th>"+FunctionText+"</th></tr></thead>";
			
		for (i=0; i<TruthTable.length; i++)
		{
			if (i % 2 == 0)
			{ 
				var count = 0.85;
			}else{
				var count = 0.8;
			}

			Text += "<tr ID='"+TruthTable[i].TTROWUIName+"' style=\"opacity: " +count+ "\">";  
			var j=0;
			for (j=0; j<VariableCount; j++)
			{
				if (DisplayValue(TruthTable[i][j].Variable) == 1) {
					var color = "style=\"background-color: rgba(255,255,255,.3);font-weight: bold\""
				}else{
					var color = "";
				}

				Text = Text + "<td " + color + ">"+ DisplayValue(TruthTable[i][j].Variable)+"</td>";
			}
			Text = Text
				+ "<td><input class=\"remove-bottom full-width\" ID=\""+TruthTable[i].ButtonUIName +"\" name="+TruthTable[i].ButtonUIName +" type='button' value='"+DisplayValue(TruthTable[i].KMapEntry.Value)+"' onClick=\"ToggleTTEntry(TruthTable["+i+"])\" ></td>" 
				+ "</tr>";
		}
	}
	Text = Text + "</table>";
	return Text;
}

function GenerateKarnoMapHTML()
{
	var Text = "<table><thead><tr>";
	var h,w;
	Text = Text + "<th colspan=\"2\" ></th><th style=\"background: rgb(49,60,78);border-bottom:2px solid rgb(31, 39, 55)\" colspan="+(KMap.Width)+">";

	for (i=0; i<KMap.XVariables; i++)
	{
		Text += VariableNames[i];
	}
	
	Text += "</th></tr></thead>";
	Text += "<tbody><tr>";
	Text += "<th ></th><th style=\"border-left: none !important\"></th>";

	for (i=0; i<KMap.Width; i++)
	{
		Text += "<th class=\"header-color\" style=\"background: rgb(49,60,78)\">"+BinaryString(BitOrder[i],KMap.XVariables)+"</th>";
	}
	Text+="</tr>";
	
	for (h=0; h<KMap.Height; h++)
	{
		if (h % 2 != 0)
		{ 
			var count = 0.85;
		}else{
			var count = 0.8;
		}
		Text = Text + "<tr style=\"opacity:" +count + "\">";
		if (h==0)
		{
			Text += "<th style=\"background: rgb(49,60,78); width: 15%\" rowspan="+((KMap.Height) + 2)  +">";
			for (i=0; i<KMap.YVariables; i++)
			{
				Text += "<b class=\"header-color\">" + VariableNames[i+KMap.XVariables] + "</b>";
			}
		}
		Text += "<th class=\"header-color\" style=\"border-left: 2px solid rgb(31, 39, 55);background: rgb(49,60,78);width: 15%\" >"+BinaryString(BitOrder[h],KMap.YVariables)+"</th>";

		for (w=0; w<KMap.Width; w++)
		{

			Text += "<td  ID='"+KMap[w][h].TDUIName+"' style='text-align:center;'>"
					+ "<input class=\"remove-bottom full-width\" ID="+KMap[w][h].ButtonUIName +" name="+KMap[w][h].ButtonUIName +" type='button'  value='"+DisplayValue(KMap[w][h].Value)+"' onClick=\"ToggleKMEntry(KMap["+w+"]["+h+"])\">"
					+ "</td>";
		}
		Text += "</tr>";
	}
	Text +="</td></tr></tbody></table>";
	return Text;
}


function GenerateEquationHTML()
{
	var j;
	var i;
	for (i=0; i<Equation.UsedLength; )
	{
		var Text = "<p class=\"header-color remove-bottom\">";
		for (j=0; (j < 8) && (i<Equation.UsedLength); j++)
		{
			if (i==0) Text+= "<b>"+FunctionText + " = ";
			Text += "<span class=\"blue button half-bottom\" id=\""+Equation[i].ButtonUIName + "\" onMouseOver=\"SetShowRect(Equation["+i+"],"+i+");\" onMouseOut=\"SetShowRect(null);\" style=\"padding:5px\">";
			Text += "<b>" + Equation[i].Expression + "</span>";
			if (i<Equation.UsedLength-1) Text +=" <span> + </span>";
			i++;
		}	
		Text += "</p>"
	}
	return Text;
}

function ChangeVariableNumber( Num )
{
	InitializeTables(Num);
	ClearEquation();
	SetInnerHTML("TruthTableDiv",GenerateTruthTableHTML());
	SetInnerHTML("KarnoMapDiv",GenerateKarnoMapHTML());
	SetInnerHTML("EquationDiv",GenerateEquationHTML());
	GetElement("TwoVariableRB").checked   = (Num==2)?true:false;
	GetElement("ThreeVariableRB").checked = (Num==3)?true:false;
	GetElement("FourVariableRB").checked  = (Num==4)?true:false;
	Search();
	UpdateUI();
}

function ToggleDontCare()
{
	AllowDontCare=!AllowDontCare;
	var i=0;
	for (i=0;i<TruthTable.length; i++)
	{
		if (TruthTable[i].KMapEntry.Value==DontCare)
		{
			TruthTable[i].KMapEntry.Value=false;
		}
	}
	ChangeVariableNumber(VariableCount);
	GetElement("AllowDontCareCB").checked = AllowDontCare;
}

function PageParameter( Name )
{
	var Regex = new RegExp( "[\\?&]"+Name+"=([^&#]*)" );
	var Results = Regex.exec( window.location.href );
	if( Results != null )
	{
		return Results[1];
	}
	return "";
}

function Init()
{
	SetInnerHTML("KarnoMapDiv", GenerateKarnoMapHTML());
	SetInnerHTML("EquationDiv", GenerateEquationHTML());
	SetInnerHTML("TruthTablenDiv", GenerateTruthTableHTML());
}


var rows = document.getElementById("TruthTableDiv").getElementsByTagName("tr");
function getFirstCol(row){
    alert(row.getElementsByTagName('td')[0].innerHTML);
}

