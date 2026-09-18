def tool(name, description, properties, required):
    return {'type':'function','function':{'name':name,'description':description,'parameters':{'type':'object','properties':properties,'required':required,'additionalProperties':False}}}

TOOLS = [
    tool('searchKnowledge','Search approved public knowledge. Use bilingual keywords where useful.',{'query':{'type':'string'}},['query']),
    tool('readKnowledge','Read a full retrieved source by exact source id.',{'id':{'type':'string'}},['id']),
    tool('performActions','Perform a bounded ordered UI plan. Navigation may require visitor approval.',{
        'summary':{'type':'string','description':'Short user-visible description of ALL proposed steps'},
        'actions':{'type':'array','maxItems':12,'items':{'type':'object','properties':{
            'type':{'type':'string','enum':['moveGhost','playGesture','highlightTarget','openWindow','openProject','selectAboutTab','scrollToSection','showHint']},
            'target':{'type':'string'},'value':{'type':'string'}},'required':['type','target','value'],'additionalProperties':False}}},['summary','actions'])
]
