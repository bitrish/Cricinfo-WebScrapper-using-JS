//require all the necessary modules
let minimist=require("minimist");
let fs=require("fs");
let path=require("path");
let axios=require("axios");
let jsdom=require("jsdom");
let excel4node=require("excel4node");
let pdf=require("pdf-lib");

//to fire write node cricinfoExtractor.js --source="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results" --excel=Worldcup.csv --datafolder=data
//in source we will get the link to extract from the web
//in data folder we will write the folders of different teams
//in excel file will we write the excel file of all teams and their match details

//we acquire cmd arguments via minimst
let args=minimist(process.argv);
// console.log(args.source); console.log(args.excel); console.log(args.datafolder);

//steps-
// download using axios
// read using jsdom
// manipulate arrays to getthe desired json
// make excel using excel4node
// make df using pdf-lib

//step1-download using axios
let responseKaPromise=axios.get(args.source);
responseKaPromise.then(function(response){
	let html=response.data;
	let dom=new jsdom.JSDOM(html);
	let doc=dom.window.document;
	let matches=[];
	let matchscorecards=doc.querySelectorAll("div.match-score-block");//getting all match blocks
	//console.log(matchscorecards.length);
	for(let i=0;i<matchscorecards.length;i++)
	{
		let namesOfTeam=matchscorecards[i].querySelectorAll("div.match-score-block p");//getting name of temas
		//console.log(namesOfTeam.length);
		let team1=namesOfTeam[0].textContent;
		let team2=namesOfTeam[1].textContent;
		// console.log(team1);console.log(team2);
		let score=matchscorecards[i].querySelectorAll("div.match-score-block span.score");//getting score of both teams
		if(score.length==2){
			team1score=score[0].textContent;
			team2score=score[1].textContent;
		}
		else if(score.length==1){
			team1score=score[0].textContent;
			team2score="";
		}
		else if(score.length==0){
			team1score="";
			team2score="";
		}
		// console.log(team2score);
		// console.log(team1score);
		let result=matchscorecards[i].querySelector("div.match-score-block div.status-text");//getting result of every match
		let res=result.textContent;
		// console.log(res);
		let matchinfo=matchscorecards[i].querySelector("div.match-score-block div.match-info >div.description");
		let info=matchinfo.textContent;
		//console.log(info);
		let currmatch={};
		currmatch.team1=team1;
		currmatch.team2=team2;
		currmatch.team1score=team1score;
		currmatch.team2score=team2score;
		currmatch.result=res;
		currmatch.info=info;
		matches.push(currmatch);
	}
		//console.log(matches.length);

	//convert javascript objects to json so that we can print and save it.
	let matchesJson=JSON.stringify(matches);
	fs.writeFileSync("matches.Json",matchesJson,"utf-8");

	//step 03-manipulate arrays to get the desired json
		let teamsobject=[];
		for(let i=0;i<matches.length;i++)
		{
			//crate the team that is not present in the teams object
			createTheTeamThatIsNotThereInTeams(teamsobject,matches[i]);
		}
		for(let i=0;i<matches.length;i++)
		{
			//fill the team in corresponding teams matches
			FillTheMatchesInTheirTeamsMatches(teamsobject,matches[i],matches);
		}

		//convert javascript objects to json so that we can print and save it.
		let teamsJson=JSON.stringify(teamsobject);
	    fs.writeFileSync("teams.Json",teamsJson,"utf-8");

	//make excel using excel4node
	let wb=new excel4node.Workbook();
    //console.log(teams[1].matches[1].vs);
    //console.log(teams[1].matches[1].res);
    for(let i=0;i<teamsobject.length;i++)
    {
    	let sheet=wb.addWorksheet(teamsobject[i].name);

    	sheet.cell(1,1).string("vs");
    	sheet.cell(1,2).string("team1 score");
        sheet.cell(1,3).string("team2 score");
    	sheet.cell(1,4).string("result");
		sheet.cell(1,9).string("Match Info");
        
    	for(let j=0;j<teamsobject[i].matches.length;j++)
    	{
			
    		sheet.cell(j+2,1).string(teamsobject[i].matches[j].vs);
    		sheet.cell(j+2,2).string(teamsobject[i].matches[j].selfScore);
            sheet.cell(j+2,3).string(teamsobject[i].matches[j].oppScore);
    		sheet.cell(j+2,4).string(teamsobject[i].matches[j].result);
			sheet.cell(j+2,9).string(teamsobject[i].matches[j].info);
    	}
    }
    wb.write(args.excel);

    fs.mkdirSync(args.datafolder);
    for (let i = 0; i < teamsobject.length; i++) {
    let teamFN = path.join(args.datafolder, teamsobject[i].name);
    fs.mkdirSync(teamFN);
    for (let j = 0; j < teamsobject[i].matches.length; j++) {
        let matchFileName = path.join(teamFN, teamsobject[i].matches[j].vs + ".pdf");
        createScoreCard(teamsobject[i].name, teamsobject[i].matches[j], matchFileName);
    }
}

function createScoreCard(teamName, match, matchFileName) {
    let t1 = teamName;
    let t2 = match.vs;
    let s1 = match.selfScore;
    let s2 = match.oppScore;
    let result  = match.result;
	let info=match.info;
    let bytesOfPDFTemplate = fs.readFileSync("Template.pdf");
    let pdfdocKaPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
    pdfdocKaPromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);

        page.drawText(t1, {
            x: 160,
            y: 533,
            size: 12
        });
        page.drawText(t2, {
            x: 160,
            y: 500,
            size: 12
        });
        page.drawText(s1, {
            x: 400,
            y: 533,
            size: 12
        });
        page.drawText(s2, {
            x: 400,
            y: 500,
            size: 12
        });
        page.drawText(result, {
            x: 200,
            y: 427,
            size: 12
        });
		page.drawText(info, {
            x: 80,
            y: 650,
            size: 10
        });
        let finalPDFBytesKaPromise = pdfdoc.save();
        finalPDFBytesKaPromise.then(function(finalPDFBytes){
            fs.writeFileSync(matchFileName, finalPDFBytes);
        })
    })
}


}).catch(function(err){
	console.log(err);
})

function createTheTeamThatIsNotThereInTeams(teamsobject,match,matches){
	let idx=-1;
	for(let i=0;i<teamsobject.length;i++)
	{
		if(teamsobject[i].name==match.team1)
		{
			idx=i;
			break;
		}
	}
	if(idx==-1)
	{
		teamsobject.push({
			name:match.team1,
			matches:[

			]
		});
	}
	let idx1=-1;
	for(let i=0;i<teamsobject.length;i++)
	{
		if(teamsobject[i].name==match.team2)
		{
			idx1=i;
			break;
		}
	}
	if(idx1==-1)
	{
		teamsobject.push({
			name:match.team2,
			matches:[

			]
		});
	}
}

function FillTheMatchesInTheirTeamsMatches(teamsobject,match){
	let idx=-1;
	for(let i=0;i<teamsobject.length;i++)
	{
		if(teamsobject[i].name==match.team1)
		{
			idx=i;
			break;
		}
	}
	let teamone = teamsobject[idx];
	teamone.matches.push({
		vs: match.team2,
		selfScore: match.team1score,
		oppScore: match.team2score,
		result: match.result,
		info:match.info
	});
	let idx1=-1;
	for(let i=0;i<teamsobject.length;i++)
	{
		if(teamsobject[i].name==match.team2)
		{
			idx1=i;
			break;
		}
	}
	let teamtwo = teamsobject[idx1];
	teamtwo.matches.push({
		vs: match.team1,
		selfScore: match.team2score,
		oppScore: match.team1score,
		result: match.result,
		info:match.info
	});
}







