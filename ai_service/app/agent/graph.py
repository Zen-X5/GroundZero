from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_groq import ChatGroq
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.messages import SystemMessage

import os
from app.agent.tools import AGENT_TOOLS
from app.core.config import settings

# --- PATCH FOR WINDOWS CONDA ENVIRONMENTS ---
# MINGW64/Conda often sets a broken SSL_CERT_FILE path, causing httpx/Groq to crash.
os.environ.pop("SSL_CERT_FILE", None)

# Define the state for the LangGraph agent
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

def build_graph():
    # Initialize the Groq LLM (GPT OSS 20B for high reasoning capability)
    llm = ChatGroq(
        model="openai/gpt-oss-20b", 
        api_key=settings.GROQ_API_KEY,
        temperature=0.0
    )
    
    # Bind our MongoDB tools to the LLM
    llm_with_tools = llm.bind_tools(AGENT_TOOLS)
    
    # System prompt to give the agent its persona and instructions
    system_prompt = SystemMessage(content=(
        "You are the Ground-Zero Command Agent, an advanced tactical AI assistant for a disaster response dashboard. "
        "Your role is to help the human commander make critical decisions by fetching live data from the drone swarm and database. "
        "Always be concise, professional, and precise. If asked about survivors, drones, sectors, or buildings, ALWAYS use the provided tools to fetch real-time data before answering. "
        "Do not guess. The situation is a severe earthquake followed by flash flooding. Communication infrastructure is down, and the swarm is providing an ad-hoc MANET."
        "If someone ask you something out of these domain,simply say Data not available for that"
    ))
    
    def chatbot(state: AgentState):
        messages = state["messages"]
        # Prepend the system prompt if it's not already the first message
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [system_prompt] + messages
            
        response = llm_with_tools.invoke(messages)
        return {"messages": [response]}
        
    # Build the StateGraph
    graph_builder = StateGraph(AgentState)
    
    # Add Nodes
    graph_builder.add_node("chatbot", chatbot)
    tool_node = ToolNode(tools=AGENT_TOOLS)
    graph_builder.add_node("tools", tool_node)
    
    # Add Edges
    graph_builder.add_conditional_edges(
        "chatbot",
        tools_condition, # Automatically routes to 'tools' if LLM decides to call a tool, else END
    )
    graph_builder.add_edge("tools", "chatbot")
    graph_builder.add_edge(START, "chatbot")
    
    # Compile the graph into a runnable application
    return graph_builder.compile()

# Global instance of the compiled agent graph
command_agent = build_graph()
