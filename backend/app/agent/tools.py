def tool(name, description, properties, required):
    return {'type':'function','function':{'name':name,'description':description,'parameters':{'type':'object','properties':properties,'required':required,'additionalProperties':False}}}

TOOLS = [
    tool('searchKnowledge','Search approved public knowledge and return relevant passage text with source metadata. Use these passages directly to answer; use bilingual keywords where useful.',{'query':{'type':'string'}},['query']),
    tool('present','Introduce one target or a list of sibling targets. Supply one short factual introduction per item. The client handles the route, highlighting, scrolling cues and animation; the visitor performs every page action. Ordinary answers belong in your text response.',{
        'items':{'type':'array','minItems':1,'maxItems':20,'items':{'type':'object','properties':{
            'target':{'type':'string','minLength':1,'maxLength':160,'pattern':'^[a-zA-Z0-9:_-]+$'},
            'introduction':{'type':'string','minLength':1,'maxLength':200}},'required':['target','introduction'],'additionalProperties':False}}},['items'])
]
