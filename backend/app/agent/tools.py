def tool(name, description, properties, required):
    return {'type':'function','function':{'name':name,'description':description,'parameters':{'type':'object','properties':properties,'required':required,'additionalProperties':False}}}

TOOLS = [
    tool('searchKnowledge','Search approved public knowledge. Use bilingual keywords where useful.',{'query':{'type':'string'}},['query']),
    tool('readKnowledge','Read a full retrieved source by exact source id.',{'id':{'type':'string'}},['id']),
    tool('present','Return display-only Monty instructions. Never navigate, scroll, click, type, open UI, or change tabs.',{
        'actions':{'type':'array','maxItems':12,'items':{'type':'object','properties':{
            'type':{'type':'string','enum':['speak','setState','highlight','guideTo','showHint','showRecommendation']},
            'target':{'type':'string'},'value':{'type':'string'}},'required':['type','target','value'],'additionalProperties':False}}},['actions'])
]
